# Sellpia / DB / Internal Name Mapping

This document fixes the current meaning of confusing field names before deeper
code cleanup. The database column names stay unchanged during stabilization.

## Date Names

| Meaning | Recommended internal name | Current DB column | Sellpia/source field | Current use |
| --- | --- | --- | --- | --- |
| Receipt / collection date used for daily work | `receiptDate` | `orders.ord_date`, `order_items.ord_date`, `shortage.work_date` | selected `collect_date` search range | Main picking, shortage, inspection daily filter |
| Actual Sellpia order date/time | `sellpiaOrderDate` | `orders.order_date` when enriched | `c_ord_date` | Reference only; must not replace receipt-date filtering |
| Scrape timestamp | `scrapedAt` | `scraped_at` | browser runtime time | Audit / fallback only |
| Last local update timestamp | `updatedAt` | `updated_at` | browser runtime time | Save/update audit |

Rule: daily work screens should use `receiptDate`. `sellpiaOrderDate` is useful
context, but it is not the business-day bucket used by the morning collect
workflow.

## Order Identity

| Meaning | Recommended internal name | Current DB column | Sellpia/source field | Notes |
| --- | --- | --- | --- | --- |
| Sellpia order number | `sellpiaOrderNo` | `ord_no` | `c_ord_no` | Primary order identity from Sellpia |
| Invoice number | `invoiceNo` | `inv_no`, `dnum` | `c_delinum` | May be blank at first scrape; can be patched later |
| Work/display number | `workNo` | derived in app | derived from loaded order order | UI-only picking/inspection order |
| Original Sellpia row/order sequence | `sellpiaSeqNo` | `sort_order`, `sellpia_seq_no`, `original_seq_no` | grid row `num` | Reference / optional display only |
| AM/PM bucket | `collectSession` | `am_pm` | parsed from collect/order time | Used for morning/afternoon filters |

## Item Identity

| Meaning | Recommended internal name | Current DB column | Sellpia/source field | Notes |
| --- | --- | --- | --- | --- |
| Sellpia item number | `sellpiaItemNo` | `item_no` | `c_prv_item_no` or starred order-item number grid column | Preferred key with `invoiceNo` |
| Item sort order inside invoice | `itemSortOrder` | `item_sort_order`, `sort_order` | grid row `num` | Used as fallback ordering |
| Sellpia product code | `sellpiaPCode` | `order_items.p_code`, `sellpia_p_code` | `c_p_code` | Image filename key; example `10773-18` |
| Own/internal product code | `ownCode` | `prod_code`, `p_dpcode`, `picking.p_code`, `shortage.p_code` | `c_dp_code` | Picking/display key; not image filename key |
| Product name | `productName` | `p_name` | `c_prd_name` | Secondary display on picking cards |
| Option name | `optionName` | `p_option` | `c_opt_name` | Primary display on picking cards |
| Ordered quantity | `orderedQty` | `qty`, `o_amount` | `c_item_amount` | Item quantity |

Rule: do not use `ownCode` as an image key. Product images use `sellpiaPCode`.

## Picking / Shortage / Inspection

| Meaning | Recommended internal name | Current DB column | Tables | Notes |
| --- | --- | --- | --- | --- |
| Picked checkbox | `isPicked` | `is_checked` | `picking` | Item-level picking done state |
| Shortage quantity | `shortageQty` | `shortage_qty`, `short_qty`, `memo2_val` | `picking`, `shortage` | `memo2_val` is Sellpia memo-facing text |
| Drawer number | `drawerNo` | `drawer_no` | `picking`, `shortage` | Invoice/item support field depending on flow |
| Hold flag | `isHold` | `hold` | `picking` | Shipping hold display state |
| Shortage workflow status | `shortageStatus` | `status` | `shortage` | Values include shipping-wait, picking-done, inspection-done, send-wait, partial-send, sent-done |
| Inspection passed state | `isInspected` | `passed` | `inspection` | Invoice done marker still uses a legacy marker row |
| Inspection memo | `inspectionMemo` | `insp_memo` | `inspection` | Item-level inspection memo |

## Current Adapter Rule

| Direction | Function / area | Rule |
| --- | --- | --- |
| DB row to app meaning | `normalizeOrderRow`, `normalizeOrderItemRow`, `normalizePickingRow`, `normalizeShortageRow`, `normalizeCsMisongRow` | Convert existing DB/source names into recommended internal names |
| App meaning to DB row | `toPickingDbRow`, `toShortageDbRow`, `toInspectionDbRow` | Convert only at save boundary |
| Staging table routing | `tableName`, `dbJoinPath`, bookmarklet `mapDbPath`, memo updater `dbPath` | First REST path segment maps to `stg_*` tables in stabilization |

## Bookmarklet Mapping To Split Later

The current bookmarklet still builds `orderRows` and `itemRows` inline inside
`runScraper`. When it is safe to edit the one-line `SRC` payload, split those
inline objects into named functions:

| Proposed function | Input | Output table | Must preserve |
| --- | --- | --- | --- |
| `mapSellpiaOrderRow(it, targetDate, now, ordSeq)` | one Sellpia grid row | `orders` | `ord_date = targetDate` as receipt date, not actual order date |
| `mapSellpiaItemRow(it, targetDate, now)` | one Sellpia grid row | `order_items` | `p_code = sellpiaPCode`, `prod_code = ownCode` |
| `mapSellpiaInvoicePatch(row)` | one Sellpia grid row | `orders`, `order_items` PATCH | `inv_no` patch without rewriting order rows |
| `mapSellpiaPostOfficePatch(row)` | one Sellpia/grid enrichment row | `orders` PATCH | recipient fields only, no picking status changes |

Do not refactor the bookmarklet payload in the same commit as behavior changes.
First extract functions with byte-for-byte equivalent object keys, then test
one invoice with the stabilization tables.
