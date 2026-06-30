# Shortage Completion Model - 2026-06-30

The proposed direction is to stop treating `shortage` as a separate copied
order list. Keep the original order and item rows as the source of truth, then
store only workflow events or completion states.

## Current Pain

- Shortage rows duplicate pieces of `orders` and `order_items`.
- Missing or stale `inv_no`, `item_no`, `p_code`, and memo values can create
  ghost rows.
- Inspection sometimes needs the full invoice, but shortage rows often only
  describe the shortage item.
- Deleting shortage rows removes the signal needed by the memo updater.

## Better Model

| Source | Role |
| --- | --- |
| `orders` | Keep all invoice/order group rows. |
| `order_items` | Keep all item rows. |
| `picking_events` or `workflow_item_state` | Store item-level events: picked, shortage created, shortage repicked, inspected. |
| `workflow_invoice_state` | Store invoice-level states: hold, CS pending, inspection complete. |
| `sellpia_sync_queue` | Store what must be pushed back to Sellpia and whether it succeeded. |

## Screen Rules

| Screen | Query Rule |
| --- | --- |
| Picking tab | Show current receipt-date orders and item states. |
| Shortage picking tab | Show original orders/items where shortage event exists and shortage repick is not completed. |
| Inspection tab | Show full invoice/order group when any item from that invoice was repicked from shortage. |
| CS tab | Show invoice/order groups with hold/CS state or memo signal. |
| Memo updater | Read from sync queue, not by guessing from deleted/remaining shortage rows. |

## Why This Fits The Real Workflow

Receiving stock does not create a new order. It changes which existing shortage
items are ready to pick. Therefore the original order should remain unchanged,
and the system should store only what happened to each item.

This also makes "미송피킹 완료했지만 검품은 다음날" natural: the repick event
remains incomplete until inspection event is recorded, regardless of selected
receipt date.
