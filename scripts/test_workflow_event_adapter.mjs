import assert from "node:assert/strict";
import { buildWorkflowQueues, workflowOrderGroupNos } from "../src/adapters/workflowEventAdapter.mjs";
import { ITEM_EVENT } from "../src/workflows/workflowEvents.mjs";

const orders = [
  {
    ord_no: "G1",
    inv_no: "6890000000001",
    receiver: "김테스트",
    orderer: "김테스트",
    ord_date: "2026-06-29",
    sort_order: 1,
  },
];

const orderItems = [
  {
    ord_no: "G1",
    item_no: "202606290001_1",
    prod_code: "[P] A-01",
    p_code: "10000-1",
    p_name: "상품 A",
    p_option: "옵션 A",
    qty: 1,
    sort_order: 1,
  },
  {
    ord_no: "G1",
    item_no: "202606290001_2",
    prod_code: "[P] A-02",
    p_code: "10000-2",
    p_name: "상품 B",
    p_option: "옵션 B",
    qty: 1,
    sort_order: 2,
  },
];

const crossDayEvents = [
  {
    id: 1,
    receipt_date: "2026-06-29",
    order_group_no: "G1",
    invoice_no: "6890000000001",
    sellpia_item_no: "202606290001_1",
    event_type: ITEM_EVENT.SHORTAGE_CREATED,
    quantity: 1,
    event_at: "2026-06-29T01:00:00Z",
  },
  {
    id: 2,
    receipt_date: "2026-06-29",
    order_group_no: "G1",
    invoice_no: "6890000000001",
    sellpia_item_no: "202606290001_1",
    event_type: ITEM_EVENT.SHORTAGE_REPICK_COMPLETED,
    event_at: "2026-07-01T01:00:00Z",
  },
];

assert.deepEqual(workflowOrderGroupNos({ itemEvents: crossDayEvents }), ["G1"]);

const openInspection = buildWorkflowQueues({
  orders,
  orderItems,
  itemEvents: crossDayEvents,
});

assert.equal(openInspection.shortageItems.length, 0);
assert.equal(openInspection.inspectionInvoices.length, 1);
assert.equal(openInspection.inspectionInvoices[0].orderGroupNo, "G1");
assert.equal(openInspection.inspectionInvoices[0].items.length, 2);

const inspected = buildWorkflowQueues({
  orders,
  orderItems,
  itemEvents: [
    ...crossDayEvents,
    {
      id: 3,
      receipt_date: "2026-06-29",
      order_group_no: "G1",
      invoice_no: "6890000000001",
      sellpia_item_no: "202606290001_1",
      event_type: ITEM_EVENT.INSPECTION_COMPLETED,
      event_at: "2026-07-02T01:00:00Z",
    },
  ],
});

assert.equal(inspected.inspectionInvoices.length, 0);

const memo1Only = buildWorkflowQueues({
  orders: [{ ...orders[0], o_shop_memo: "S47" }],
  orderItems,
  itemEvents: [],
  invoiceEvents: [],
});

assert.equal(memo1Only.shortageItems.length, 2);
assert.equal(memo1Only.shortageItems[0].state.drawerMemo, "S47");
assert.equal(memo1Only.shortageItems[0].state.shortageQty, 1);

const memo2Shortage = buildWorkflowQueues({
  orders,
  orderItems: [{ ...orderItems[0], o_shop_memo2: "2" }, orderItems[1]],
  itemEvents: [],
  invoiceEvents: [],
});

assert.equal(memo2Shortage.shortageItems.length, 1);
assert.equal(memo2Shortage.shortageItems[0].state.shortageQty, 2);

const memo2Repicked = buildWorkflowQueues({
  orders,
  orderItems: [{ ...orderItems[0], o_shop_memo2: "\u3141" }, orderItems[1]],
  itemEvents: [],
  invoiceEvents: [],
});

assert.equal(memo2Repicked.shortageItems.length, 0);
assert.equal(memo2Repicked.inspectionInvoices.length, 1);
assert.equal(memo2Repicked.inspectionInvoices[0].items.length, 2);

console.log("workflow event adapter tests passed");
