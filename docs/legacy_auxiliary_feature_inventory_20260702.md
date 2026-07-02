# Legacy Auxiliary Feature Inventory - 2026-07-02

Scope: production `FULL_System/index.html` auxiliary UI and export/CS helpers that are not part of the F.v1 core picking/order/inspection path.

## Already Ported Or Covered In F.v1

| Feature | Production entry point | F.v1 status | Notes |
| --- | --- | --- | --- |
| Group bulk check | `bulkCheckJo` | Ported | Guarded by `?write=1`. |
| Drawer keypad | `openKeypad` | Ported | F.v1 saves drawer through picking row writes. |
| Order list modal | `showOrderListModal` | Ported | Read-only modal. |
| Planned print CSV | `downloadPlannedPrintList` | Ported | Uses F.v1 system ordering. |
| Toggle CSV | `downloadPostOfficeCsv` | Ported | User verified actual downloaded file output. |
| Gold label XLSX | `insp_exportLabelCSV` | Ported | User verified actual downloaded file output. |
| Post-office enrichment status | `showPostOfficeEnrichmentStatus` | Ported as read-only | F.v1 reports current Toggle CSV readiness only; no DB updates. |

## Candidate For Later Port

| Feature | Production entry point | Current dependency | Suggested F.v1 approach |
| --- | --- | --- | --- |
| CS tab list and filters | `renderCSPanel`, `renderCSList`, `switchCSType`, `switchCSStatus`, `switchCSDay` | GAS `misongData`, direct status mutations | Rebuild from workflow events first; only add write actions through event rows. |
| CS current export | `downloadCSCurrent` | CS list state, contact hydration | Read-only export can be ported after CS list model exists. |
| CS bulk complete / clean done | `completeSelectedCS`, `cleanSelectedCSDone` | Direct status/delete patterns | Do not copy directly; design event-based status transitions. |
| CS drawer / shortage edits | `updateCSDrawer`, `updateCSShortage` | Direct picking sheet + misong sync | Port only after event/state mapping is defined. |
| CS customer memo | `saveCSMemo` | Local/GAS-ish CS state | Port as workflow invoice event memo if needed. |
| Makeshop CSV mapping upload | `handleMakeshopCSV`, `uploadMakeshopCSV` | CSV parsing and external mapping | Low priority; production code notes it is not fully implemented. |
| CS direct CSV upload | `handleCSDirectFile`, `uploadCSDirectData` | Direct append to misong/status data | Redesign as import preview + event inserts; no direct updates. |
| Zone status popup | `openZoneSortPopup`, zone sort helpers | Legacy zone grouping | Read-only candidate; keep separate from core sorting. |
| Sidebar collapse | `toggleSidebar` | Layout-only | Safe UI candidate, but test tablet widths first. |
| Header status chips navigation | `setView` via top status chips | Legacy view modes | Partly covered by F.v1 filters; port only if operators still need one-click shortcuts. |

## Hold / Do Not Port As-Is

| Feature | Production entry point | Reason |
| --- | --- | --- |
| Post-office enrichment DB patch | scraper/bookmarklet `enrichOrdersForPostOffice`, `updateOrderEnrichmentToDb` | Direct `orders` PATCH. Needs explicit target review and a safer import/preview flow. |
| Invoice refresh DB patch | scraper/bookmarklet `patchInvoiceRows`, `runInvoiceRefresh` | Direct `orders`/`order_items` update. Keep in production scraper until F.v1 has an approved write flow. |
| Hard delete / direct cleanup patterns | scraper and CS cleanup helpers | F.v1 should use event-based state or approved maintenance scripts only. |
| Zone sort as main ordering | `toggleZoneSort`, `zoneSortOrders` | Production README says zone order is auxiliary, not the core workflow. |

## Recommended Order

1. Read-only CS list model from F.v1 workflow events.
2. Read-only CS export from that model.
3. Read-only zone status popup.
4. Sidebar collapse if tablet testing shows benefit.
5. Event-based CS actions only after the read-only model is stable.
