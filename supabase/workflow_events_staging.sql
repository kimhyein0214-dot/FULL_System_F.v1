-- Workflow events staging schema for FULL_System_F.v1.
-- This is a prototype schema. Do not run against production until the workflow
-- is tested and access policy is reviewed.

create table if not exists public.workflow_item_events (
  id bigserial primary key,
  receipt_date date,
  order_group_no text not null,
  invoice_no text,
  sellpia_item_no text not null,
  sellpia_product_code text,
  own_code text,
  event_type text not null check (
    event_type in (
      'picked',
      'pick_unchecked',
      'shortage_created',
      'shortage_qty_changed',
      'shortage_repick_completed',
      'inspection_completed',
      'inspection_reopened',
      'cancelled'
    )
  ),
  quantity numeric,
  memo text,
  drawer_memo text,
  actor text,
  source text not null default 'front',
  event_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.workflow_invoice_events (
  id bigserial primary key,
  receipt_date date,
  order_group_no text not null,
  invoice_no text,
  event_type text not null check (
    event_type in (
      'hold_created',
      'hold_released',
      'cs_pending',
      'cs_resolved',
      'shortage_invoice_repick_completed',
      'inspection_completed',
      'inspection_reopened',
      'cancelled'
    )
  ),
  memo text,
  actor text,
  source text not null default 'front',
  event_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.sellpia_sync_queue (
  id bigserial primary key,
  target_scope text not null check (target_scope in ('invoice', 'item')),
  order_group_no text not null,
  invoice_no text,
  sellpia_item_no text,
  action_type text not null check (
    action_type in (
      'memo1_set',
      'memo1_clear',
      'memo2_set',
      'memo2_clear',
      'hold_set',
      'hold_release',
      'order_memo_set',
      'order_memo_clear'
    )
  ),
  target_value text,
  status text not null default 'queued' check (status in ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
  attempts integer not null default 0,
  last_error text,
  requested_by text,
  requested_at timestamptz not null default now(),
  synced_at timestamptz,
  payload jsonb not null default '{}'::jsonb
);

create index if not exists workflow_item_events_lookup_idx
  on public.workflow_item_events (order_group_no, sellpia_item_no, event_at desc, id desc);

create index if not exists workflow_item_events_invoice_idx
  on public.workflow_item_events (invoice_no, event_at desc, id desc);

create index if not exists workflow_item_events_receipt_idx
  on public.workflow_item_events (receipt_date, event_type, event_at desc);

create index if not exists workflow_invoice_events_lookup_idx
  on public.workflow_invoice_events (order_group_no, event_at desc, id desc);

create index if not exists workflow_invoice_events_invoice_idx
  on public.workflow_invoice_events (invoice_no, event_at desc, id desc);

create index if not exists sellpia_sync_queue_status_idx
  on public.sellpia_sync_queue (status, requested_at, id);

alter table public.workflow_item_events enable row level security;
alter table public.workflow_invoice_events enable row level security;
alter table public.sellpia_sync_queue enable row level security;

-- F.v1 prototype policy.
-- The current production frontend already works with a browser publishable key.
-- Keep these policies only for staging/prototype use. Replace with authenticated
-- user policies before production hardening.
revoke all privileges on table public.workflow_item_events from anon, authenticated;
revoke all privileges on table public.workflow_invoice_events from anon, authenticated;
revoke all privileges on table public.sellpia_sync_queue from anon, authenticated;

grant select, insert, update on public.workflow_item_events to anon, authenticated;
grant select, insert, update on public.workflow_invoice_events to anon, authenticated;
grant select, insert, update on public.sellpia_sync_queue to anon, authenticated;

revoke all privileges on sequence public.workflow_item_events_id_seq from anon, authenticated;
revoke all privileges on sequence public.workflow_invoice_events_id_seq from anon, authenticated;
revoke all privileges on sequence public.sellpia_sync_queue_id_seq from anon, authenticated;

grant usage, select on sequence public.workflow_item_events_id_seq to anon, authenticated;
grant usage, select on sequence public.workflow_invoice_events_id_seq to anon, authenticated;
grant usage, select on sequence public.sellpia_sync_queue_id_seq to anon, authenticated;

drop policy if exists "prototype read workflow item events" on public.workflow_item_events;
drop policy if exists "prototype write workflow item events" on public.workflow_item_events;
drop policy if exists "prototype read workflow invoice events" on public.workflow_invoice_events;
drop policy if exists "prototype write workflow invoice events" on public.workflow_invoice_events;
drop policy if exists "prototype read sellpia sync queue" on public.sellpia_sync_queue;
drop policy if exists "prototype write sellpia sync queue" on public.sellpia_sync_queue;

create policy "prototype read workflow item events"
  on public.workflow_item_events for select
  to anon, authenticated
  using (true);

create policy "prototype write workflow item events"
  on public.workflow_item_events for insert
  to anon, authenticated
  with check (true);

create policy "prototype read workflow invoice events"
  on public.workflow_invoice_events for select
  to anon, authenticated
  using (true);

create policy "prototype write workflow invoice events"
  on public.workflow_invoice_events for insert
  to anon, authenticated
  with check (true);

create policy "prototype read sellpia sync queue"
  on public.sellpia_sync_queue for select
  to anon, authenticated
  using (true);

create policy "prototype write sellpia sync queue"
  on public.sellpia_sync_queue for insert
  to anon, authenticated
  with check (true);
