# Workflow Events Query Rules - 2026-06-30

This is the event-based replacement for duplicating shortage orders.

## Principle

`orders` and `order_items` remain the source of truth. Screens decide what to
show by reading workflow events.

## Event Tables

| Table | Scope | Purpose |
| --- | --- | --- |
| `workflow_item_events` | item | Picked state, shortage creation, shortage repick, item inspection |
| `workflow_invoice_events` | invoice/order group | Hold, CS, invoice-level inspection |
| `sellpia_sync_queue` | invoice/item | Work that must be pushed back to Sellpia |

## Screen Queries

| Screen | Source rows | Event filter | Result |
| --- | --- | --- | --- |
| Picking | `orders` + `order_items` for `receiptDate` | picked/shortage/hold states | Current receipt-date picking list |
| Shortage picking | original `orders` + `order_items` | item has `shortage_created` and no later `shortage_repick_completed`/`inspection_completed`/`cancelled` | All open shortage items |
| Inspection | original full invoice | invoice has any item with `shortage_repick_completed` and no later inspection completion | Full invoice, not just shortage items |
| CS | original invoice | invoice has `hold_created` or `cs_pending` and no resolving event | CS work list |
| Memo updater | `sellpia_sync_queue` | `status = queued` | Deterministic Sellpia updates |

## Barcode Flow

The real workflow mirrors Sellpia order search:

1. Scan invoice barcode.
2. Search by `invoiceNo`.
3. Load original invoice/order group and all items.
4. Overlay workflow event state.
5. Append a new event when the worker completes the action.

## Why Not Delete Shortage Rows

Deleting a shortage row removes the fact that Sellpia must be cleared or that a
later inspection still has to happen. Events keep history and allow each screen
to show only unfinished work.

## Next Migration Step

Do not remove the current `shortage` table yet. First run F.v1 in parallel:

1. Continue reading old `shortage` as compatibility input.
2. Write new actions into `workflow_item_events` and `workflow_invoice_events`.
3. Compare old shortage screen counts with event-derived counts.
4. Switch screens to event-derived queries after counts match.
5. Move Sellpia memo updater to `sellpia_sync_queue`.

## F.v1 Picking Test Flags

| URL flag | Effect |
| --- | --- |
| `?write=1` | Allows the standalone picking tab to write to the existing `picking` table. |
| `?write=1&events=1` | Also attempts to insert workflow item events. If event tables are not prepared, picking save still succeeds and the event failure is only reported as a warning. |

## What The Operator Must Do

Nothing is required for read-only testing.

Before testing `?write=1&events=1`, run or approve
`supabase/workflow_events_staging.sql` in the Supabase SQL Editor. Until that SQL
is applied, the F.v1 page shows event status as `미준비` and skips event inserts
while keeping the existing picking save path usable.
