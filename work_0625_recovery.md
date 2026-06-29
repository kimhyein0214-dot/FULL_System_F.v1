# 2026-06-25 Recovery Notes

## Active Workspace
- Work folder: `C:\Users\hihi0\OneDrive\문서\2026\Picking System\0608`
- Git branch: `main`
- Main frontend: `index.html`
- PWA cache: `sw.js`

## Current Goal
Continue the photo/order-memo/gift-badge work without losing context.

## Supabase Projects
- `System_v1`: `bpgvqmtsjgegnrdzmpep`
  - Used for `product-images` storage bucket.
  - Image metadata table/view:
    - `public.sellpia_product_images`
    - `public.sellpia_product_images_public`
- `PR_system`: `vgxocngpykhlkosiaeew`
  - Used for picking/order data.
  - Needs order amount, item amount, order memo, and gift keyword columns.

## SQL Files
- `supabase/system_v1_image_setup.sql`
  - Creates/updates `product-images` bucket.
  - Creates `sellpia_product_images`.
  - Drops and recreates `sellpia_product_images_public` to avoid `cannot drop columns from view`.
  - Adds RLS policies for public read/insert/update on image metadata and `product-images/sellpia/*`.
- `supabase/pr_system_order_gift_setup.sql`
  - Adds:
    - `orders.order_memo`
    - `orders.sellpia_order_total_amount`
    - `orders.sellpia_order_total_amount_raw`
    - `orders.gift_keyword_present`
    - `order_items.sellpia_item_sales_amount`
    - `order_items.sellpia_item_sales_amount_raw`
    - `order_items.gift_keyword_present`

## CLI Commands
Run from:
`C:\Users\hihi0\OneDrive\문서\2026\Picking System\0608`

```powershell
npx supabase@latest link --project-ref bpgvqmtsjgegnrdzmpep
npx supabase@latest db query --linked --file .\supabase\system_v1_image_setup.sql

npx supabase@latest link --project-ref vgxocngpykhlkosiaeew
npx supabase@latest db query --linked --file .\supabase\pr_system_order_gift_setup.sql

npx supabase@latest link --project-ref bpgvqmtsjgegnrdzmpep
```

If `--linked` fails on the installed CLI, retry the same `db query` command without `--linked`.

## Frontend Changes Applied
- Photo upload target now prefers Sellpia code.
- Photo upload writes to `product-images/sellpia/{sellpiaCode}.jpg`.
- Photo metadata upserts to `sellpia_product_images`.
- Uploaded photo updates `photoMap` for Sellpia code and alias own-code keys.
- Photo async reload now re-renders active picking/inspection/missing-picking views.
- Inspection header uses total amount badge plus red `사은품확인!` badge when:
  - total order amount is at least 20,000
  - no "사은품" text is found in order/item data
- PWA cache version bumped to `0625-image-db-gift-v1`.

## Verified
```powershell
node -c Final_Sellpia_V1.js
node -e / index script syntax check
```

Both syntax checks passed.

## Not Done Yet
- Need run Supabase SQL successfully in both projects.
- Need browser verify:
  - image upload from missing photo cell
  - photo remains after refresh
  - `사은품확인!` badge appears only on qualifying invoices
- Need commit/push/deploy after verification.
