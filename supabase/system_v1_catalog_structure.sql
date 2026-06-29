-- System_v1 catalog/image resolution structure
-- Target project: bpgvqmtsjgegnrdzmpep (System_v1)
--
-- Purpose:
-- - Keep PR_system product metadata separate from System_v1 uploaded image assets.
-- - Preserve PR_system products.image_url as legacy_image_url.
-- - Resolve display images by Sellpia p_code with System_v1 Storage first, then legacy image_url.

create schema if not exists catalog;

grant usage on schema catalog to anon, authenticated;

create table if not exists catalog.sellpia_products (
  p_code text primary key,
  own_code text,
  legacy_image_url text,
  legacy_image_source text not null default 'pr_system.products.image_url',
  source_system text not null default 'PR_system',
  source_project_ref text not null default 'vgxocngpykhlkosiaeew',
  source_updated_at timestamptz,
  imported_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  raw_payload jsonb not null default '{}'::jsonb,
  constraint sellpia_products_p_code_format check (p_code ~ '^[0-9]{3,}(-[0-9]+)?$')
);

create index if not exists sellpia_products_own_code_idx
  on catalog.sellpia_products (own_code);

create index if not exists sellpia_products_legacy_image_url_idx
  on catalog.sellpia_products ((legacy_image_url is not null and btrim(legacy_image_url) <> ''));

alter table catalog.sellpia_products enable row level security;

drop policy if exists "sellpia products readable" on catalog.sellpia_products;
create policy "sellpia products readable"
on catalog.sellpia_products
for select
to anon, authenticated
using (true);

grant select on catalog.sellpia_products to anon, authenticated;

create or replace view public.sellpia_products_public
with (security_invoker = true)
as
select
  p_code,
  own_code,
  legacy_image_url,
  legacy_image_source,
  source_system,
  source_project_ref,
  source_updated_at,
  imported_at,
  updated_at
from catalog.sellpia_products;

grant select on public.sellpia_products_public to anon, authenticated;

-- Backfill catalog rows for image assets that already existed before the
-- PR_system Google URL migration.
insert into catalog.sellpia_products (
  p_code,
  own_code,
  legacy_image_url,
  legacy_image_source,
  source_system,
  source_project_ref,
  source_updated_at,
  imported_at,
  updated_at,
  raw_payload
)
select
  i.p_code,
  i.own_code,
  nullif(btrim(i.source_image_url), '') as legacy_image_url,
  'system_v1.asset.source_image_url' as legacy_image_source,
  'System_v1_existing_asset' as source_system,
  'bpgvqmtsjgegnrdzmpep' as source_project_ref,
  i.source_updated_at,
  now(),
  now(),
  jsonb_build_object(
    'filled_from', 'asset.sellpia_product_images',
    'storage_path', i.storage_path,
    'storage_public_url', i.storage_public_url
  ) as raw_payload
from asset.sellpia_product_images i
left join catalog.sellpia_products p on p.p_code = i.p_code
where p.p_code is null
  and i.p_code ~ '^[0-9]{3,}(-[0-9]+)?$'
  and nullif(btrim(i.storage_public_url), '') is not null
on conflict (p_code) do nothing;

create or replace view public.product_images_resolved
with (security_invoker = true)
as
select
  coalesce(p.p_code, i.p_code) as p_code,
  coalesce(p.own_code, i.own_code) as own_code,
  p.legacy_image_url,
  i.storage_public_url,
  i.source_image_url,
  case
    when nullif(btrim(i.storage_public_url), '') is not null then i.storage_public_url
    when nullif(btrim(p.legacy_image_url), '') is not null then p.legacy_image_url
    when nullif(btrim(i.source_image_url), '') is not null then i.source_image_url
    else null
  end as display_image_url,
  case
    when nullif(btrim(i.storage_public_url), '') is not null then 'system_v1.storage_public_url'
    when nullif(btrim(p.legacy_image_url), '') is not null then 'pr_system.products.image_url'
    when nullif(btrim(i.source_image_url), '') is not null then 'system_v1.source_image_url'
    else null
  end as display_image_source,
  i.upload_status as system_upload_status,
  greatest(p.updated_at, i.updated_at) as updated_at
from catalog.sellpia_products p
full join public.sellpia_product_images_public i
  on i.p_code = p.p_code;

grant select on public.product_images_resolved to anon, authenticated;
