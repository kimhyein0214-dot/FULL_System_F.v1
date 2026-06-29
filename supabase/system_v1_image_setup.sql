-- System_v1 image storage/catalog setup
-- Target project: bpgvqmtsjgegnrdzmpep (System_v1)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.sellpia_product_images (
  p_code text primary key,
  own_code text,
  bucket text not null default 'product-images',
  storage_path text not null,
  storage_public_url text,
  source_image_url text,
  upload_status text not null default 'uploaded',
  mime_type text default 'image/jpeg',
  size_bytes bigint,
  uploaded_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sellpia_product_images_own_code_idx
  on public.sellpia_product_images (own_code);

alter table public.sellpia_product_images enable row level security;

drop policy if exists "sellpia product images public read" on public.sellpia_product_images;
create policy "sellpia product images public read"
on public.sellpia_product_images
for select
to anon, authenticated
using (true);

drop policy if exists "sellpia product images public insert" on public.sellpia_product_images;
create policy "sellpia product images public insert"
on public.sellpia_product_images
for insert
to anon, authenticated
with check (true);

drop policy if exists "sellpia product images public update" on public.sellpia_product_images;
create policy "sellpia product images public update"
on public.sellpia_product_images
for update
to anon, authenticated
using (true)
with check (true);

grant select, insert, update on public.sellpia_product_images to anon, authenticated;

drop view if exists public.sellpia_product_images_public;

create or replace view public.sellpia_product_images_public
with (security_invoker = true)
as
select
  p_code,
  own_code,
  bucket,
  storage_path,
  storage_public_url,
  source_image_url,
  upload_status,
  updated_at
from public.sellpia_product_images;

grant select on public.sellpia_product_images_public to anon, authenticated;

drop policy if exists "product images sellpia public read" on storage.objects;
create policy "product images sellpia public read"
on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'product-images'
);

drop policy if exists "product images sellpia public insert" on storage.objects;
create policy "product images sellpia public insert"
on storage.objects
for insert
to anon, authenticated
with check (
  bucket_id = 'product-images'
);

drop policy if exists "product images sellpia public update" on storage.objects;
create policy "product images sellpia public update"
on storage.objects
for update
to anon, authenticated
using (
  bucket_id = 'product-images'
)
with check (
  bucket_id = 'product-images'
);
