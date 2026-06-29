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
| CS status save | `persistMisongStatus` | `shortage` | Direct literal shortage status row | Candidate after CS row alias | Medium |
| CS arrival date | `updateArrivalDate` | `shortage` | Direct field update | Keep direct for now | Medium |
| CS shortage edit | `updateCSShortage` | `picking` | Direct literal picking row | Candidate after CS row alias | Medium |
| CS direct CSV upload | `uploadCSDirectData` | `shortage` | Minimal direct row | Needs dedicated adapter | Medium |
| CS cleanup | `cleanSelectedCSDone`, `deleteMisongRow`, `cleanMisongDone` | `shortage` | Hard delete | Hold until soft-delete decision | High |
| Inspection item memo | inspection memo timer | `inspection` | Direct upsert | `toInspectionDbRow` added, not wired | Medium |
| Inspection done marker | `toggleInspectionDone` | `inspection` | Direct `__done__` marker | Hold until inspection key strategy | Medium-high |
| Inspection status transitions | `toggleInspectionDone` | `shortage`, `picking` | Direct status/hold updates | Hold, semantics sensitive | High |
| Misong picking shortage | `saveMisongShortage` | `picking`, `shortage` | Direct literal rows | Candidate after status semantics split | Medium-high |

## Next Safe Refactor Order

1. Wire `insp_saveMemo` through `toInspectionDbRow` without changing its `inv_no,p_code` conflict key.
2. Add small alias builders for CS/misong rows without changing writes.
3. Convert `updateCSShortage` picking row next.
4. Leave hard deletes and inspection status transitions until staging tables are live.

## Do Not Touch Yet

- `shortage` hard deletes used for cleanup.
- Inspection done marker key: `inv_no,p_code` with `__done__`.
- Workflow status transitions used by shortage, inspection, and memo cleanup.
- Legacy `p_code` cleanup deletes until item-number matching is verified on staging data.
