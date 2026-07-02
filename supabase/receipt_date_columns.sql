alter table public.orders add column if not exists receipt_date date;
alter table public.order_items add column if not exists receipt_date date;
alter table public.stg_orders add column if not exists receipt_date date;
alter table public.stg_order_items add column if not exists receipt_date date;
