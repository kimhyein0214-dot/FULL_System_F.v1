-- PR_system order amount / gift flag setup
-- Target project: vgxocngpykhlkosiaeew (PR_system)

alter table public.orders
  add column if not exists order_memo text,
  add column if not exists sellpia_order_total_amount numeric,
  add column if not exists sellpia_order_total_amount_raw text,
  add column if not exists gift_keyword_present boolean not null default false;

alter table public.order_items
  add column if not exists sellpia_item_sales_amount numeric,
  add column if not exists sellpia_item_sales_amount_raw text,
  add column if not exists gift_keyword_present boolean not null default false;

create index if not exists orders_gift_keyword_present_idx
  on public.orders (gift_keyword_present);

create index if not exists order_items_gift_keyword_present_idx
  on public.order_items (gift_keyword_present);

