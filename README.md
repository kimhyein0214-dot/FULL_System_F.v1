# FULL_System_F.v1

Picking System rebuild workspace.

This repository is now treated as a clean rebuild branch, not a patched copy of
the old production frontend.

## Current Rule

- Production stays in `kimhyein0214-dot/FULL_System`.
- This repository is for rebuilding the system from the workflow model.
- Old monolithic frontend/bookmarklet files were removed from this branch.
- The pre-clean snapshot remains in local branch
  `backup/pre-clean-start-20260630-195557`.
- No production deployment should be switched to this repository until the new
  flow passes real workflow tests.

## Rebuild Direction

1. Define workflow first: receiving, picking, shortage picking, inspection, CS,
   memo sync, label export.
2. Define domain names once and use adapters for existing DB column names.
3. Separate Sellpia scraping, Supabase reads/writes, and UI state.
4. Keep shortage/hold/inspection/sync states separate instead of overloading one
   table field.
5. Bring old code back only when the responsible workflow and data contract are
   already written down.

## Repository Layout

| Path | Purpose |
| --- | --- |
| `docs/` | Current analysis, mappings, rebuild plans |
| `src/domain/` | Standard internal data model and workflow contracts |
| `src/adapters/` | Sellpia/Supabase/current-DB mapping layer |
| `src/workflows/` | Picking, shortage, inspection, CS, label, memo flows |
| `supabase/` | Existing schema/RPC references and staging SQL |
| `scripts/` | Diagnostic and one-off analysis scripts only |

## Useful References

- `docs/sellpia_db_column_mapping.md`
- `docs/stabilization_save_path_inventory.md`
- `docs/staging_write_test_checklist.md`
- `docs/legacy_file_inventory_20260630.md`
