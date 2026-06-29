# FULL_System_F.v1

This repository is the stabilization workspace for the Picking System.

The current production repository remains `kimhyein0214-dot/FULL_System`.
This repository is used to test data-name cleanup, PWA cache separation, and
workflow stabilization before selected changes are moved back to production.

## Operating Rules

- Do not use this repository as the production rollback point.
- Do not commit database backups, migration logs, exported spreadsheets, or
  customer/order data.
- Keep Supabase write paths guarded until a staging DB or staging tables are
  configured.
- Treat `ord_date` in the current DB as the receipt/collection date, not the
  actual order date.
- Treat `order_date` as the Sellpia actual order date.
- Treat Sellpia product code and own code separately.

## Current Repositories

| Purpose | Repository |
| --- | --- |
| Production | `kimhyein0214-dot/FULL_System` |
| Stabilization | `kimhyein0214-dot/FULL_System_F.v1` |

## Stabilization Plan

1. Create a clean baseline in this repository.
2. Add configuration guards for Supabase environment and table names.
3. Add internal normalization aliases while keeping existing DB columns.
4. Normalize order/item/picking/shortage/inspection rows at load time.
5. Convert back to current DB column names only at save time.
6. Verify picking, shortage, inspection, gold labels, and PWA install mode.
7. Only after the code is stable, plan DB column cleanup separately.

## Staging Database Plan

The stabilization app currently keeps production table names for reads but
blocks production writes by default. This lets the UI load production-like data
without risking accidental changes.

Before testing write flows, create staging tables and switch the app configs to
those table names.

SQL plan:

- `supabase/stabilization_staging_tables.sql`

Recommended staging table names:

| Production table | Staging table |
| --- | --- |
| `orders` | `stg_orders` |
| `order_items` | `stg_order_items` |
| `picking` | `stg_picking` |
| `shortage` | `stg_shortage` |
| `inspection` | `stg_inspection` |
| `hold_items` | `stg_hold_items` |
| `sync_log` | `stg_sync_log` |

After the tables exist and Data API access is verified, update the app config:

```js
tables: {
  orders: 'stg_orders',
  orderItems: 'stg_order_items',
  picking: 'stg_picking',
  shortage: 'stg_shortage',
  inspection: 'stg_inspection',
  holdItems: 'stg_hold_items',
  syncLog: 'stg_sync_log'
}
```

Then set write allowance only for staging targets. Do not set
`allowProductionWrites: true` while connected to the production project and
production table names.

## Standard Internal Names

| Meaning | Internal name | Current DB/source names |
| --- | --- | --- |
| Receipt/collection date | `receiptDate` | `ord_date`, selected collect date |
| Sellpia order date | `sellpiaOrderDate` | `order_date`, `c_ord_date` |
| Sellpia order number | `sellpiaOrderNo` | `ord_no`, `c_ord_no` |
| Invoice number | `invoiceNo` | `inv_no`, `dnum`, `c_delinum` |
| Sellpia item number | `sellpiaItemNo` | `item_no`, `c_prv_item_no` |
| Sellpia product code | `sellpiaPCode` | `order_items.p_code`, `sellpia_p_code`, `c_p_code` |
| Own code | `ownCode` | `prod_code`, `p_dpcode`, `picking.p_code`, `shortage.p_code`, `c_dp_code` |
| Product name | `productName` | `p_name`, `c_prd_name` |
| Option name | `optionName` | `p_option`, `c_opt_name` |
| Ordered quantity | `orderedQty` | `qty`, `o_amount`, `c_item_amount` |
| Shortage quantity | `shortageQty` | `short_qty`, `shortage_qty` |
| Drawer number | `drawerNo` | `drawer_no` |
| Picked state | `isPicked` | `is_checked`, `checked` |
| Inspected state | `isInspected` | `inspection.passed` |

## Save Path Inventory

- `docs/stabilization_save_path_inventory.md`
- `docs/staging_write_test_checklist.md`

Use this inventory before changing any `picking`, `shortage`, or `inspection`
write path. It separates low-risk alias adapter candidates from status changes
and hard deletes that should wait for staging write tests.

## Verification

Before any production backport:

- `index.html` inline script syntax check passes.
- `git diff --check` passes.
- GitHub Pages URL for this repository loads separately from production.
- PWA install mode does not show stale production UI.
- Test write actions do not change production Supabase tables.
