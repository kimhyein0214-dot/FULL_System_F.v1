# Stabilization Save Path Inventory

This inventory is intentionally non-behavioral. It records where the app still
builds database save rows directly so the next refactor can be scoped without
guesswork.

## Current Rule

- Keep current DB columns unchanged.
- Read rows through app-side aliases first.
- Convert back to DB column names only at save time.
- Do not change delete/status semantics until staging write tests are available.

## Summary

| Area | Function / path | Table | Current shape | Alias status | Risk |
| --- | --- | --- | --- | --- | --- |
| Picking tab main save | `saveToSheet` | `picking`, `shortage` | `toPickingDbRow`, `toShortageDbRow` | Applied | Low |
| Picking memo save | `saveMemo` | `picking` | `toPickingDbRow` identity fields plus `memo` | Applied | Low |
| CS status save | `persistMisongStatus` | `shortage` | Direct literal shortage status row | `normalizeCsMisongRow` added, not wired | Medium |
| CS arrival date | `updateArrivalDate` | `shortage` | Direct field update | Keep direct for now | Medium |
| CS shortage edit | `updateCSShortage` | `picking` | `normalizeCsMisongRow` + `toPickingDbRow` shortage fields | Applied | Low-medium |
| CS direct CSV upload | `uploadCSDirectData` | `shortage` | Minimal direct row | Needs dedicated adapter | Medium |
| CS cleanup | `cleanSelectedCSDone`, `deleteMisongRow`, `cleanMisongDone` | `shortage` | Hard delete | Hold until soft-delete decision | High |
| Inspection item memo | `insp_saveMemo` | `inspection` | `toInspectionDbRow` memo fields | Applied | Low-medium |
| Inspection done marker | `toggleInspectionDone` | `inspection` | Direct `__done__` marker | Hold until inspection key strategy | Medium-high |
| Inspection status transitions | `toggleInspectionDone` | `shortage`, `picking` | Direct status/hold updates | Hold, semantics sensitive | High |
| Misong picking shortage | `saveMisongShortage` | `picking`, `shortage` | Direct literal rows | `normalizeCsMisongRow` added, not wired | Medium-high |

## Next Safe Refactor Order

1. Keep `persistMisongStatus` and `saveMisongShortage` direct until staging write tests.
2. Add staging write test checklist before deeper status/delete changes.
3. Leave hard deletes and inspection status transitions until staging tables are live.

## Do Not Touch Yet

- `shortage` hard deletes used for cleanup.
- Inspection done marker key: `inv_no,p_code` with `__done__`.
- Workflow status transitions used by shortage, inspection, and memo cleanup.
- Legacy `p_code` cleanup deletes until item-number matching is verified on staging data.

## Staging Test Requirement

- `docs/staging_write_test_checklist.md`

`persistMisongStatus`, `saveMisongShortage`, inspection done markers, status
transitions, and hard deletes stay direct until the staging checklist is run.
