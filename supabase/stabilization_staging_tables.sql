-- FULL_System_F.v1 stabilization staging tables
--
-- Purpose
-- - Keep production tables untouched while testing the stabilization repo.
-- - Let the app/bookmarklets switch table names from production tables to stg_*.
-- - Keep this file as an explicit SQL plan; do not run it against production
--   without confirming backups and API/RLS policy expectations.
--
-- Target project today:
-- - PR_system project ref: vgxocngpykhlkosiaeew
--
-- Recommended workflow:
-- 1. Run the CREATE TABLE section in Supabase SQL Editor.
-- 2. Confirm the stg_* tables are exposed to the Data API as needed.
-- 3. Seed only a small test receipt date or a few invoices.
-- 4. Switch APP_CONFIG tables in the stabilization repo to stg_*.
-- 5. Test write flows.
-- 6. Truncate stg_* whenever the test set should be reset.

begin;

create table if not exists public.stg_orders
(like public.orders including defaults including constraints including indexes);

create table if not exists public.stg_order_items
(like public.order_items including defaults including constraints including indexes);

create table if not exists public.stg_picking
(like public.picking including defaults including constraints including indexes);

create table if not exists public.stg_shortage
(like public.shortage including defaults including constraints including indexes);

create table if not exists public.stg_inspection
(like public.inspection including defaults including constraints including indexes);

create table if not exists public.stg_hold_items
(like public.hold_items including defaults including constraints including indexes);

create table if not exists public.stg_sync_log
(like public.sync_log including defaults including constraints including indexes);

commit;

-- Optional RLS mirror.
-- If production tables use RLS, mirror policies intentionally instead of
-- blindly opening the staging tables. The current browser app uses publishable
-- keys, so SELECT/INSERT/UPDATE/DELETE behavior must be verified after creation.
--
-- Example only:
-- alter table public.stg_orders enable row level security;
-- create policy "stg_orders_all_for_testing" on public.stg_orders
--   for all to anon, authenticated
--   using (true)
--   with check (true);

-- Optional seed for one receipt date.
-- Replace the date and run only when you want a small test dataset.
--
-- insert into public.stg_orders
-- select * from public.orders
-- where ord_date = '2026-06-29'
-- on conflict do nothing;
--
-- insert into public.stg_order_items
-- select * from public.order_items
-- where ord_date = '2026-06-29'
-- on conflict do nothing;
--
-- insert into public.stg_picking
-- select p.*
-- from public.picking p
-- join public.stg_orders o on o.ord_no = p.ord_no
-- on conflict do nothing;
--
-- insert into public.stg_shortage
-- select s.*
-- from public.shortage s
-- join public.stg_orders o on o.ord_no = s.ord_no
-- on conflict do nothing;
--
-- insert into public.stg_inspection
-- select i.*
-- from public.inspection i
-- join public.stg_orders o on o.ord_no = i.ord_no
-- on conflict do nothing;

-- Reset staging data.
-- truncate table
--   public.stg_inspection,
--   public.stg_shortage,
--   public.stg_picking,
--   public.stg_hold_items,
--   public.stg_order_items,
--   public.stg_orders,
--   public.stg_sync_log
-- restart identity;
