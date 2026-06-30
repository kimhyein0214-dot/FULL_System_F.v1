# Legacy File Inventory - 2026-06-30

Clean-start branch: `rebuild/clean-start`

Local backup branch before cleanup:
`backup/pre-clean-start-20260630-195557`

Removed from the clean-start branch because these files were old monolithic
runtime files or versioned copies that should not drive the rebuild directly.

## Removed Frontend/PWA Files

- `index.html`
- `picking-system_0511.css`
- `picking-system_0515.css`
- `picking-system_0519.css`
- `manifest.webmanifest`
- `sw.js`
- `pwa-icon.svg`

## Removed Sellpia Runtime Files

- `Final_Sellpia_V1.html`
- `Final_Sellpia_V1.js`
- `sellpia_bookmarklet_0512_v1.html`
- `sellpia_bookmarklet_0515_v1.html`
- `sellpia_bookmarklet_0519_v1.html`
- `sellpia_memo_updater_0608_order_search.html`
- `sellpia_memo_updater_v5.2_0512.html`
- `sellpia_memo_updater_v5.3_0515.html`
- `sellpia_memo_updater_v5.3_0519.html`

## Removed Misc Files

- `TODO.md`
- `work_0625_recovery.md`
- `scripts/migrate_google_images_to_system_v1.mjs`

## Kept As Reference

- `docs/`
- `supabase/`
- `.github/workflows/pages.yml`
- `.gitignore`

Old code should be copied back only after the target workflow and data contract
are defined in `src/domain`, `src/adapters`, or `src/workflows`.
