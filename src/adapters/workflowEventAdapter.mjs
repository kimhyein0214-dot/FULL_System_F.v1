import { buildPickingViewModel } from "../workflows/picking/buildPickingViewModel.mjs";
import {
  buildWorkflowState,
  openShortageItems,
  repickedInvoicesForInspection,
} from "../workflows/workflowEvents.mjs";

function text(value) {
  return String(value ?? "").trim();
}

function uniqueTexts(values = []) {
  return [...new Set((values || []).map(text).filter(Boolean))];
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

export function workflowOrderGroupNos({ itemEvents = [], invoiceEvents = [] } = {}) {
  return uniqueTexts([
    ...itemEvents.map((row) => row.order_group_no),
    ...invoiceEvents.map((row) => row.order_group_no),
  ]);
}

export async function fetchWorkflowEvents(db, { orderGroupNos = null, pageSize = 1000 } = {}) {
  const itemEvents = await fetchAllRows(
    () =>
      applyOptionalIn(db.from("workflow_item_events").select("*"), "order_group_no", orderGroupNos)
        .order("event_at", { ascending: true })
        .order("id", { ascending: true }),
    pageSize,
  );

  const invoiceEvents = await fetchAllRows(
    () =>
      applyOptionalIn(db.from("workflow_invoice_events").select("*"), "order_group_no", orderGroupNos)
        .order("event_at", { ascending: true })
        .order("id", { ascending: true }),
    pageSize,
  );

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

export function buildWorkflowQueues({ orders = [], orderItems = [], itemEvents = [], invoiceEvents = [] } = {}) {
  const viewModel = buildPickingViewModel({
    orders,
    orderItems,
    pickingRows: [],
    shortageRows: [],
  });
  const workflowState = buildWorkflowState({ itemEvents, invoiceEvents });

  return {
    viewModel,
    workflowState,
    shortageItems: openShortageItems(viewModel, workflowState),
    inspectionInvoices: repickedInvoicesForInspection(viewModel, workflowState),
  };
}

export async function loadWorkflowQueues(db, { pageSize = 1000 } = {}) {
  const { itemEvents, invoiceEvents } = await fetchWorkflowEvents(db, { pageSize });
  const { orders, orderItems, orderGroupNos } = await fetchOrdersForWorkflowEvents(db, {
    itemEvents,
    invoiceEvents,
    pageSize,
  });

  return {
    orderGroupNos,
    itemEvents,
    invoiceEvents,
    ...buildWorkflowQueues({ orders, orderItems, itemEvents, invoiceEvents }),
  };
}
