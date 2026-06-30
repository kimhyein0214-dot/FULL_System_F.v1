# Daily Stabilization Plan - 2026-06-30

This plan is for the stabilization repository only:
`kimhyein0214-dot/FULL_System_F.v1`.

Production `kimhyein0214-dot/FULL_System` is actively being used for testing.
Do not push, deploy, refresh service-worker cache, or change production-facing
GitHub Pages behavior unless explicitly requested.

## Safety Rules

| Rule | Reason |
| --- | --- |
| Work only in `FULL_System_F.v1` | Avoid interrupting live tablet/mobile tests |
| No push by default | User is comparing production and stabilization manually |
| Prefer read-only diagnostics first | Stabilize behavior without changing live data |
| Keep DB columns unchanged | Current goal is app-side standard names/adapters |
| Treat `ord_date` as receipt date | Daily work filter is receipt/collection date |
| Treat `order_date` as Sellpia order date | Reference only, not the primary work date |

## Updated Work Breakdown

| ID | Scope | Detailed task | Risk | Status |
| --- | --- | --- | --- | --- |
| A1 | Diagnostics | Add read-only order flow diagnosis script for `orders`, `order_items`, `picking`, `shortage`, `inspection` | Low | In progress |
| A2 | Diagnostics | Document how to interpret `ord_date`, `order_date`, `work_date`, `updated_at`, and `status` mismatches | Low | Planned |
| A3 | F.v1 routing | Verify all `index.html` Supabase table calls go through table routing/write guard | Low-medium | Planned |
| A4 | F.v1 routing | Verify scraper bookmarklet routes writes to `stg_*` or blocks production writes | Medium | Planned |
| A5 | F.v1 routing | Verify memo updater routes item-level order memo writes to `stg_order_items` or blocks production writes | Medium | Planned |
| B1 | Frontend UX candidate | Port production memo-updater log cleanup into F.v1 only | Low | Planned |
| B2 | Frontend UX candidate | Add clearer receipt-date / shortage-date / status labels to F.v1 shortage and inspection views | Low-medium | Planned |
| B3 | Frontend UX candidate | Keep gold invoice item order unchanged inside self-code picking list while preserving invoice sorting | Medium | Planned |
| B4 | Frontend UX candidate | Keep selected ALL/AM/PM date filter visually highlighted | Low | Planned |
| C1 | Workflow model | Freeze shortage status visibility table for picking, misong picking, inspection, CS | Low | Planned |
| C2 | Workflow model | Separate "already inspected" from "missing due to date filter" in diagnostics and UI wording | Low-medium | Planned |
| C3 | Workflow model | Confirm inspection `__done__` marker strategy before refactor | Medium-high | Hold |
| D1 | Write-path tests | Run staging smoke tests for picking save and shortage save | Medium | Hold until staging data ready |
| D2 | Write-path tests | Run staging smoke tests for inspection memo only | Medium | Hold until staging data ready |
| D3 | Write-path tests | Delay hard-delete and inspection status transition refactors | High | Hold |

## Immediate Execution Batch

1. Add read-only `scripts/diagnose_order_flow.mjs`.
2. Add usage notes to this plan.
3. Run the script against the known Kim Seulgi case to verify it explains:
   - `ord_date = 2026-06-29`
   - `order_date = 2026-06-27`
   - `shortage.status = 검품완료`
   - `inspection.__done__.passed = true`
4. Run syntax checks and `git diff --check`.
5. Stop before push.

## Production Backport Queue

These are not applied to production during live testing. They are candidates to
port later after F.v1 verification.

| Candidate | Production impact | Backport condition |
| --- | --- | --- |
| Memo updater item-level log cleanup | Low | F.v1 bookmarklet loads and syntax checks pass |
| Gold invoice internal item-order exception | Medium | Visual verification on F.v1 picking list |
| Receipt/status labels in shortage and inspection | Low-medium | No layout break on tablet width |
| PWA cache bump | Medium | Only when production deployment is explicitly approved |
