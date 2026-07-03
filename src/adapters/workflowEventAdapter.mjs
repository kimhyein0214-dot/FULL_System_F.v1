import { buildPickingViewModel } from "../workflows/picking/buildPickingViewModel.mjs";
import {
  INVOICE_EVENT,
  ITEM_EVENT,
  buildWorkflowState,
  completedInvoicesForInspection,
  openShortageItems,
  repickedInvoicesForInspection,
} from "../workflows/workflowEvents.mjs";

function text(value) {
  return String(value ?? "").trim();
}

function firstText(...values) {
  for (const value of values) {
    const next = text(value);
    if (next) return next;
  }
  return "";
}

function uniqueTexts(values = []) {
  return [...new Set((values || []).map(text).filter(Boolean))];
}

function chunk(values = [], size = 300) {
  const chunks = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

function eventTime(row) {
  return new Date(row.event_at || row.created_at || 0).getTime() || 0;
}

function eventId(row) {
  return Number(row.id || 0);
}

function sortEvents(events = []) {
  return [...events].sort((a, b) => eventTime(a) - eventTime(b) || eventId(a) - eventId(b));
}

function localDateKey(value) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function latestScrapeDate(orders = []) {
  const dates = uniqueTexts(orders.map((row) => localDateKey(row.scraped_at))).sort();
  return dates[dates.length - 1] || "";
}

function ordersFromLatestScrape(orders = []) {
  const latest = latestScrapeDate(orders);
  if (!latest) return orders;
  return orders.filter((row) => localDateKey(row.scraped_at) === latest);
}

function scrapeCutoffTime(orders = []) {
  const times = orders.map((row) => new Date(row.scraped_at || 0).getTime()).filter(Number.isFinite);
  return times.length ? Math.min(...times) : 0;
}

function eventsAfterScrape(events = [], orders = []) {
  const cutoff = scrapeCutoffTime(orders);
  if (!cutoff) return events;
  return events.filter((row) => eventTime(row) >= cutoff);
}

async function fetchAllRows(makeQuery, pageSize = 1000) {
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    const { data, error } = await makeQuery().range(from, to);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

function applyOptionalIn(query, column, values) {
  const list = uniqueTexts(values);
  return list.length ? query.in(column, list) : query;
}

async function fetchRowsByInChunks(makeQuery, column, values, pageSize = 1000) {
  const list = uniqueTexts(values);
  if (!list.length) return [];

  const rows = [];
  for (const nextChunk of chunk(list)) {
    rows.push(...(await fetchAllRows(() => makeQuery().in(column, nextChunk), pageSize)));
  }
  return rows;
}

export function workflowOrderGroupNos({ itemEvents = [], invoiceEvents = [] } = {}) {
  return uniqueTexts([
    ...itemEvents.map((row) => row.order_group_no),
    ...invoiceEvents.map((row) => row.order_group_no),
  ]);
}

export async function fetchWorkflowEvents(db, { orderGroupNos = null, pageSize = 1000 } = {}) {
  const hasExplicitScope = orderGroupNos !== null && orderGroupNos !== undefined;
  const scopedOrderGroupNos = uniqueTexts(orderGroupNos);
  if (hasExplicitScope && !scopedOrderGroupNos.length) {
    return { itemEvents: [], invoiceEvents: [] };
  }

  const itemQuery = () => db.from("workflow_item_events").select("*").order("event_at", { ascending: true }).order("id", { ascending: true });
  const invoiceQuery = () => db.from("workflow_invoice_events").select("*").order("event_at", { ascending: true }).order("id", { ascending: true });

  const itemEvents = scopedOrderGroupNos.length
    ? sortEvents(await fetchRowsByInChunks(itemQuery, "order_group_no", scopedOrderGroupNos, pageSize))
    : await fetchAllRows(() => applyOptionalIn(itemQuery(), "order_group_no", orderGroupNos), pageSize);

  const invoiceEvents = scopedOrderGroupNos.length
    ? sortEvents(await fetchRowsByInChunks(invoiceQuery, "order_group_no", scopedOrderGroupNos, pageSize))
    : await fetchAllRows(() => applyOptionalIn(invoiceQuery(), "order_group_no", orderGroupNos), pageSize);

  return { itemEvents, invoiceEvents };
}

export async function fetchOrdersForWorkflowEvents(db, { itemEvents = [], invoiceEvents = [], pageSize = 1000 } = {}) {
  const orderGroupNos = workflowOrderGroupNos({ itemEvents, invoiceEvents });
  if (!orderGroupNos.length) return { orders: [], orderItems: [], orderGroupNos };

  const orders = await fetchAllRows(
    () => db.from("orders").select("*").in("ord_no", orderGroupNos).order("sort_order", { ascending: true, nullsFirst: false }),
    pageSize,
  );

  const orderItems = await fetchAllRows(
    () => db.from("order_items").select("*").in("ord_no", orderGroupNos).order("sort_order", { ascending: true, nullsFirst: false }),
    pageSize,
  );

  return { orders, orderItems, orderGroupNos };
}

function orderGroupNo(row = {}) {
  return firstText(row.ord_no, row.order_group_no, row.group_no);
}

function invoiceNo(row = {}) {
  return firstText(row.inv_no, row.dnum, row.invoice_no);
}

function receiptDate(row = {}) {
  return firstText(row.receipt_date);
}

function invoiceMemo1(row = {}) {
  return firstText(row.o_shop_memo, row.shop_memo, row.memo1, row.sellpia_memo1);
}

function itemNo(row = {}) {
  return firstText(row.item_no, row.sellpia_item_no, row.order_item_no);
}

function itemMemo2(row = {}) {
  return firstText(row.o_shop_memo2, row.shop_memo2, row.memo2, row.sellpia_memo2);
}

function itemShortageQty(memo) {
  const raw = text(memo);
  const number = /^\d+$/.test(raw) ? raw : raw.match(/\bshortage\s*(\d+)\b/i)?.[1] || raw.match(/\ubd80\uc871\s*(\d+)/)?.[1];
  return number ? Number(number) : 1;
}

function isRepickDoneMemo(memo) {
  const compact = text(memo).replace(/\s+/g, "");
  return (
    compact === "\u3141" ||
    compact === "\u2713" ||
    compact === "\u2714" ||
    compact.toLowerCase() === "done" ||
    compact.includes("\ud53c\ud0b9\uc644\ub8cc")
  );
}

function syntheticEventAt(row = {}) {
  return firstText(row.updated_at, row.created_at, row.event_at, row.receipt_date) || "1970-01-01T00:00:00Z";
}

export function buildSyntheticMemoEvents({ orders = [], orderItems = [] } = {}) {
  const ordersByGroup = new Map();
  const syntheticItemEvents = [];
  const syntheticInvoiceEvents = [];
  let syntheticId = -1;

  for (const order of orders) {
    const groupNo = orderGroupNo(order);
    if (!groupNo) continue;
    ordersByGroup.set(groupNo, order);
    const memo1 = invoiceMemo1(order);
    if (!memo1) continue;

    syntheticInvoiceEvents.push({
      id: syntheticId--,
      receipt_date: receiptDate(order) || null,
      order_group_no: groupNo,
      invoice_no: invoiceNo(order),
      event_type: INVOICE_EVENT.HOLD_CREATED,
      memo: memo1,
      source: "sellpia_memo_compat",
      event_at: syntheticEventAt(order),
      payload: { synthetic: true, memo1 },
    });
  }

  for (const item of orderItems) {
    const groupNo = orderGroupNo(item);
    const sellpiaItemNo = itemNo(item);
    if (!groupNo || !sellpiaItemNo) continue;

    const order = ordersByGroup.get(groupNo) || {};
    const memo1 = invoiceMemo1(order) || invoiceMemo1(item);
    const memo2 = itemMemo2(item);
    if (!memo2) continue;

    const repickDone = isRepickDoneMemo(memo2);
    syntheticItemEvents.push({
      id: syntheticId--,
      receipt_date: receiptDate(item) || receiptDate(order) || null,
      order_group_no: groupNo,
      invoice_no: invoiceNo(item) || invoiceNo(order),
      sellpia_item_no: sellpiaItemNo,
      sellpia_product_code: firstText(item.p_code, item.sellpia_p_code, item.sellpia_product_code),
      own_code: firstText(item.prod_code, item.p_dpcode, item.own_code),
      event_type: repickDone ? ITEM_EVENT.SHORTAGE_REPICK_COMPLETED : ITEM_EVENT.SHORTAGE_CREATED,
      quantity: repickDone ? null : memo2 ? itemShortageQty(memo2) : 1,
      memo: memo2 || memo1,
      drawer_memo: memo1 || null,
      source: "sellpia_memo_compat",
      event_at: syntheticEventAt(item) || syntheticEventAt(order),
      payload: { synthetic: true, memo1, memo2 },
    });
  }

  return { itemEvents: syntheticItemEvents, invoiceEvents: syntheticInvoiceEvents };
}

export function buildWorkflowQueues({ orders = [], orderItems = [], pickingRows = [], shortageRows = [], itemEvents = [], invoiceEvents = [] } = {}) {
  const syntheticEvents = buildSyntheticMemoEvents({ orders, orderItems });
  const mergedItemEvents = [...syntheticEvents.itemEvents, ...itemEvents];
  const mergedInvoiceEvents = [...syntheticEvents.invoiceEvents, ...invoiceEvents];
  const viewModel = buildPickingViewModel({
    orders,
    orderItems,
    pickingRows,
    shortageRows,
  });
  const workflowState = buildWorkflowState({ itemEvents: mergedItemEvents, invoiceEvents: mergedInvoiceEvents });

  return {
    viewModel,
    workflowState,
    syntheticEvents,
    shortageItems: openShortageItems(viewModel, workflowState),
    inspectionInvoices: repickedInvoicesForInspection(viewModel, workflowState),
    inspectionCompletedInvoices: completedInvoicesForInspection(viewModel, workflowState),
  };
}

export async function loadWorkflowQueues(db, { pageSize = 1000 } = {}) {
  const allOrders = await fetchAllRows(
    () => db.from("orders").select("*").order("receipt_date", { ascending: false, nullsFirst: false }).order("sort_order", { ascending: true, nullsFirst: false }),
    pageSize,
  );
  const orders = ordersFromLatestScrape(allOrders);

  const orderGroupNos = uniqueTexts(orders.map(orderGroupNo));
  const events = orderGroupNos.length ? await fetchWorkflowEvents(db, { orderGroupNos, pageSize }) : { itemEvents: [], invoiceEvents: [] };
  const itemEvents = eventsAfterScrape(events.itemEvents, orders);
  const invoiceEvents = eventsAfterScrape(events.invoiceEvents, orders);

  const orderItems = orderGroupNos.length
    ? await fetchRowsByInChunks(
        () => db.from("order_items").select("*").order("sort_order", { ascending: true, nullsFirst: false }),
        "ord_no",
        orderGroupNos,
        pageSize,
      )
    : [];
  const pickingRows = orderGroupNos.length
    ? await fetchRowsByInChunks(
        () => db.from("picking").select("*"),
        "ord_no",
        orderGroupNos,
        pageSize,
      )
    : [];
  const shortageRows = orderGroupNos.length
    ? await fetchRowsByInChunks(
        () => db.from("shortage").select("*"),
        "ord_no",
        orderGroupNos,
        pageSize,
      )
    : [];

  return {
    orderGroupNos,
    itemEvents,
    invoiceEvents,
    pickingRows,
    shortageRows,
    ...buildWorkflowQueues({ orders, orderItems, pickingRows, shortageRows, itemEvents, invoiceEvents }),
  };
}
