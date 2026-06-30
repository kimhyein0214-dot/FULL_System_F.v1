import {
  makeItemStateKey,
  normalizeCurrentDbItem,
  normalizeCurrentDbOrder,
  normalizePickingState,
} from "../../adapters/currentDbPickingAdapter.mjs";

function compareNullableNumbers(a, b) {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a - b;
}

function compareItems(a, b) {
  const sort = compareNullableNumbers(a.sortOrder, b.sortOrder);
  if (sort !== 0) return sort;
  return compareNullableNumbers(a.itemOrderIndex, b.itemOrderIndex);
}

function compareInvoices(a, b) {
  const sort = compareNullableNumbers(a.sortOrder, b.sortOrder);
  if (sort !== 0) return sort;
  return String(a.orderGroupNo).localeCompare(String(b.orderGroupNo), "ko");
}

export function buildPickingViewModel({
  orders = [],
  orderItems = [],
  pickingRows = [],
  shortageRows = [],
} = {}) {
  const pickingStateByKey = new Map();
  const shortageStateByKey = new Map();

  for (const row of pickingRows) {
    const state = normalizePickingState(row);
    pickingStateByKey.set(state.key, state);
  }

  for (const row of shortageRows) {
    const state = normalizePickingState(row);
    shortageStateByKey.set(state.key, state);
  }

  const invoiceByGroup = new Map();
  for (const order of orders.map(normalizeCurrentDbOrder)) {
    if (!order.orderGroupNo) continue;
    invoiceByGroup.set(order.orderGroupNo, { ...order, items: [] });
  }

  for (const item of orderItems.map(normalizeCurrentDbItem)) {
    if (!item.orderGroupNo || !item.sellpiaItemNo) continue;

    if (!invoiceByGroup.has(item.orderGroupNo)) {
      invoiceByGroup.set(item.orderGroupNo, {
        orderGroupNo: item.orderGroupNo,
        invoiceNo: item.invoiceNo,
        recipientName: "",
        buyerName: "",
        displayName: "",
        csDisplayName: "",
        seller: "",
        recipientPhone: "",
        buyerPhone: "",
        orderTotalAmount: null,
        receiptDate: "",
        sellpiaMemo1: "",
        orderMemo: "",
        sortOrder: null,
        raw: null,
        items: [],
      });
    }

    const key = makeItemStateKey(item.orderGroupNo, item.sellpiaItemNo);
    const pickingState = pickingStateByKey.get(key) || null;
    const shortageState = shortageStateByKey.get(key) || null;

    invoiceByGroup.get(item.orderGroupNo).items.push({
      ...item,
      pickingState,
      shortageState,
    });
  }

  const invoices = Array.from(invoiceByGroup.values())
    .map((invoice) => ({
      ...invoice,
      items: invoice.items.sort(compareItems),
    }))
    .sort(compareInvoices);

  return {
    version: "2026-06-30.1",
    invoices,
    totals: {
      invoices: invoices.length,
      items: invoices.reduce((sum, invoice) => sum + invoice.items.length, 0),
    },
  };
}
