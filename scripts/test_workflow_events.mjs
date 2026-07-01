import assert from "node:assert/strict";
import {
  ITEM_EVENT,
  INVOICE_EVENT,
  buildWorkflowState,
  completedInvoicesForInspection,
  openShortageItems,
  repickedInvoicesForInspection,
} from "../src/workflows/workflowEvents.mjs";

const viewModel = {
  invoices: [
    {
      orderGroupNo: "G1",
      invoiceNo: "6890000000001",
      items: [
        { sellpiaItemNo: "I1", ownCode: "A-1" },
        { sellpiaItemNo: "I2", ownCode: "A-2" },
      ],
    },
    {
      orderGroupNo: "G2",
      invoiceNo: "6890000000002",
      items: [{ sellpiaItemNo: "I3", ownCode: "B-1" }],
    },
  ],
};

const openState = buildWorkflowState({
  itemEvents: [
    { id: 1, order_group_no: "G1", sellpia_item_no: "I1", event_type: ITEM_EVENT.SHORTAGE_CREATED, quantity: 2, event_at: "2026-06-30T01:00:00Z" },
  ],
});

assert.equal(openShortageItems(viewModel, openState).length, 1);
assert.equal(repickedInvoicesForInspection(viewModel, openState).length, 0);

const repickedState = buildWorkflowState({
  itemEvents: [
    { id: 1, order_group_no: "G1", sellpia_item_no: "I1", event_type: ITEM_EVENT.SHORTAGE_CREATED, quantity: 2, event_at: "2026-06-30T01:00:00Z" },
    { id: 2, order_group_no: "G1", sellpia_item_no: "I1", event_type: ITEM_EVENT.SHORTAGE_REPICK_COMPLETED, event_at: "2026-07-01T01:00:00Z" },
  ],
});

assert.equal(openShortageItems(viewModel, repickedState).length, 0);
assert.deepEqual(
  repickedInvoicesForInspection(viewModel, repickedState).map((row) => row.orderGroupNo),
  ["G1"],
);
assert.equal(repickedInvoicesForInspection(viewModel, repickedState)[0].items.length, 2);

const invoiceRepickedState = buildWorkflowState({
  invoiceEvents: [
    { id: 1, order_group_no: "G2", event_type: INVOICE_EVENT.SHORTAGE_INVOICE_REPICK_COMPLETED, event_at: "2026-07-01T01:00:00Z" },
  ],
});

assert.deepEqual(
  repickedInvoicesForInspection(viewModel, invoiceRepickedState).map((row) => row.orderGroupNo),
  ["G2"],
);

const crossDayEvents = [
  {
    id: 1,
    receipt_date: "2026-06-29",
    order_group_no: "G1",
    sellpia_item_no: "I1",
    event_type: ITEM_EVENT.SHORTAGE_CREATED,
    quantity: 1,
    event_at: "2026-06-29T01:00:00Z",
  },
  {
    id: 2,
    receipt_date: "2026-06-29",
    order_group_no: "G1",
    sellpia_item_no: "I1",
    event_type: ITEM_EVENT.SHORTAGE_REPICK_COMPLETED,
    event_at: "2026-07-01T01:00:00Z",
  },
];

const crossDayState = buildWorkflowState({ itemEvents: crossDayEvents });

assert.deepEqual(
  repickedInvoicesForInspection(viewModel, crossDayState).map((row) => row.orderGroupNo),
  ["G1"],
);
assert.equal(repickedInvoicesForInspection(viewModel, crossDayState)[0].items.length, 2);

const crossDayInspectedState = buildWorkflowState({
  itemEvents: [
    ...crossDayEvents,
    {
      id: 3,
      receipt_date: "2026-06-29",
      order_group_no: "G1",
      sellpia_item_no: "I1",
      event_type: ITEM_EVENT.INSPECTION_COMPLETED,
      event_at: "2026-07-02T01:00:00Z",
    },
  ],
});

assert.equal(repickedInvoicesForInspection(viewModel, crossDayInspectedState).length, 0);

const invoiceInspectedState = buildWorkflowState({
  itemEvents: crossDayEvents,
  invoiceEvents: [
    {
      id: 4,
      order_group_no: "G1",
      event_type: INVOICE_EVENT.INSPECTION_COMPLETED,
      event_at: "2026-07-02T02:00:00Z",
    },
  ],
});

assert.equal(repickedInvoicesForInspection(viewModel, invoiceInspectedState).length, 0);
assert.deepEqual(
  completedInvoicesForInspection(viewModel, invoiceInspectedState).map((row) => row.orderGroupNo),
  ["G1"],
);

const invoiceReopenedState = buildWorkflowState({
  itemEvents: crossDayEvents,
  invoiceEvents: [
    {
      id: 4,
      order_group_no: "G1",
      event_type: INVOICE_EVENT.INSPECTION_COMPLETED,
      event_at: "2026-07-02T02:00:00Z",
    },
    {
      id: 5,
      order_group_no: "G1",
      event_type: INVOICE_EVENT.INSPECTION_REOPENED,
      event_at: "2026-07-02T03:00:00Z",
    },
  ],
});

assert.deepEqual(
  repickedInvoicesForInspection(viewModel, invoiceReopenedState).map((row) => row.orderGroupNo),
  ["G1"],
);
assert.equal(completedInvoicesForInspection(viewModel, invoiceReopenedState).length, 0);

console.log("workflow event tests passed");
