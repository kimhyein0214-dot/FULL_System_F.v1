# Shortage Picking / Inspection Date-Independent Flow - 2026-07-01

## Goal

Shortage picking and inspection must not disappear just because the operator
changes the selected receipt date.

Example:

1. An order was received on 2026-06-29.
2. The shortage item was repicked on 2026-07-01.
3. Inspection happens on 2026-07-02.

The inspection tab must still show the invoice on 2026-07-02. The selected
date is useful for daily picking, but it must not be the primary key for
unfinished shortage or inspection work.

## Date Roles

| Field | Role | Query usage |
| --- | --- | --- |
| `receipt_date` / `ord_date` | Sellpia receipt/collection date | Main picking date filter only |
| `event_at` | When a worker performed an action | Timeline, sorting, audit |
| `requested_at` | When a Sellpia sync request was queued | Sync queue ordering |
| selected UI date | Operator's current picking day | Must not hide open shortage/inspection work |

## Stable Keys

| Scope | Primary key in workflow | Reason |
| --- | --- | --- |
| Invoice/order group | `order_group_no` | Sellpia groups one invoice/order bundle around this key |
| Search/display fallback | `invoice_no` | Barcode and Sellpia order-search lookup |
| Item | `order_group_no + sellpia_item_no` | Prevents product-code collisions inside one invoice |

`receipt_date` may be stored on events for audit and optional filters, but it is
not part of the active workflow identity.

## Queue Rules

| Screen | Show condition | Hide condition |
| --- | --- | --- |
| Shortage picking | item has open `shortage_created` / shortage state | later `shortage_repick_completed`, `inspection_completed`, or `cancelled` |
| Inspection | invoice has any item with `shortage_repick_completed`, or invoice has `shortage_invoice_repick_completed` | later invoice `inspection_completed` or `cancelled` |
| CS | invoice has active hold/CS event or memo signal | later hold release / CS resolved / cancelled |
| Sellpia sync worker | `sellpia_sync_queue.status = queued` | `succeeded`, `cancelled`, or terminal failed state |

## Cross-Day Rule

Shortage picking and inspection queues are open-work queues. They are not
daily reports.

Default behavior:

- Show all unfinished shortage picking work regardless of receipt date.
- Show all unfinished shortage inspection work regardless of receipt date.
- Sort by operational priority, not by selected date:
  1. gold / hold / CS urgency if applicable
  2. oldest unresolved `event_at`
  3. group / invoice order
- Keep date filters as optional chips only after the base queue is correct.

## Sellpia Sync Readiness

Every action that must be pushed to Sellpia should append a row to
`sellpia_sync_queue` instead of directly assuming Sellpia was updated.

Examples:

| Front action | Workflow event | Sync queue action |
| --- | --- | --- |
| shortage created | `workflow_item_events.shortage_created` | `memo2_set`, optional `hold_set` |
| drawer/CS memo changed | `workflow_invoice_events.cs_pending` or memo payload | `memo1_set` |
| shortage repick completed | `workflow_item_events.shortage_repick_completed` | `memo2_set` with picked marker if needed |
| inspection completed | `workflow_invoice_events.inspection_completed` | `memo1_clear`, `memo2_clear`, `hold_release` |

This keeps the frontend, the database, and Sellpia synchronization loosely
coupled. If Sellpia sync fails, the unresolved sync row remains visible without
removing the workflow state.

## Frontend Loading Plan

1. Load event rows that are not terminal, or recent enough for audit.
2. Reduce events in the browser with `buildWorkflowState`.
3. Build shortage and inspection queues from reduced state.
4. Hydrate matching original `orders` and `order_items` by `order_group_no`.
5. Render full invoice in inspection, not just shortage items.

Important: do not start the shortage picking or inspection query from
`selectedDate`.

