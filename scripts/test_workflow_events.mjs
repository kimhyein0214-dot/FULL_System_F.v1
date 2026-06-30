import assert from "node:assert/strict";
import {
  ITEM_EVENT,
  INVOICE_EVENT,
  buildWorkflowState,
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

console.log("workflow event tests passed");
