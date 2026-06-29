# Staging Write Test Checklist

Use this checklist after the `stg_*` tables exist and before any production
backport. The goal is to prove that save adapters preserve current behavior
while moving writes away from production tables.

## Setup

- Confirm `supabase/stabilization_staging_tables.sql` has been reviewed.
- Create `stg_orders`, `stg_order_items`, `stg_picking`, `stg_shortage`,
  `stg_inspection`, `stg_hold_items`, and `stg_sync_log`.
- Confirm the browser Data API can read and write the `stg_*` tables.
- Seed only a small receipt date or a few invoices.
- Switch the stabilization repo table config to `stg_*`.
- Keep production table names blocked by `allowProductionWrites:false`.

## Low-Risk Save Tests

- Picking checkbox save writes to `stg_picking`.
- Picking shortage quantity save writes to `stg_picking` and `stg_shortage`.
- Picking drawer number save writes to `stg_picking`.
- Picking memo save writes only the memo fields expected by `saveMemo`.
- Inspection item memo save writes only memo fields and does not alter `passed`.
- CS shortage edit writes only picking shortage fields.

## Hold Until Explicit Review

- CS status save through `persistMisongStatus`.
- Misong picking shortage save through `saveMisongShortage`.
- Inspection done marker using `__done__`.
- Inspection status transitions across shortage and picking.
- Any hard delete against `shortage`.
- Any legacy `p_code` cleanup delete.

## Pass Criteria

- No write request reaches production table names.
- `inv_no + item_no` updates preserve item identity where available.
- Existing `inv_no + p_code` inspection memo conflict behavior is unchanged.
- Memo saves do not overwrite checkbox, shortage, drawer, hold, or passed state.
- Status-transition tests are separated from simple memo/quantity tests.
- Resetting staging data is possible with the documented truncate block.
