-- System_v1 product image upload metadata RPC
-- Target project: bpgvqmtsjgegnrdzmpep (System_v1)
--
-- Called only by the upload-product-image Edge Function with service_role.
-- Browser clients must not get direct INSERT/UPDATE policies on storage.objects
-- or asset.sellpia_product_images.

create or replace function public.upsert_uploaded_product_image(
  p_p_code text,
  p_own_code text,
  p_original_file_name text,
  p_storage_bucket text,
  p_storage_path text,
  p_storage_public_url text,
  p_content_type text,
  p_byte_size bigint
)
returns table (
  p_code text,
  own_code text,
  storage_bucket text,
  storage_path text,
  storage_public_url text,
  upload_status text
)
language plpgsql
security definer
set search_path = asset, catalog, public
as $$
declare
  v_p_code text := nullif(btrim(p_p_code), '');
  v_own_code text := nullif(btrim(p_own_code), '');
  v_bucket text := nullif(btrim(p_storage_bucket), '');
  v_path text := nullif(btrim(p_storage_path), '');
  v_public_url text := nullif(btrim(p_storage_public_url), '');
  v_content_type text := nullif(btrim(p_content_type), '');
begin
  if v_p_code is null or v_p_code !~ '^[0-9]{3,}(-[0-9]+)?$' then
    raise exception 'invalid p_code';
  end if;

  if v_bucket is distinct from 'product-images' then
    raise exception 'invalid storage bucket';
  end if;

  if v_path is null or v_path !~ ('^sellpia/' || replace(v_p_code, '-', '\-') || '\.jpg$') then
    raise exception 'invalid storage path';
  end if;

  if v_public_url is null or v_public_url not like 'https://bpgvqmtsjgegnrdzmpep.supabase.co/storage/v1/object/public/product-images/sellpia/%' then
    raise exception 'invalid storage public url';
  end if;

  if v_content_type is null or v_content_type not in ('image/jpeg', 'image/jpg') then
    raise exception 'invalid content type';
  end if;

  insert into asset.sellpia_product_images (
    p_code,
    own_code,
    original_file_name,
    source_image_url,
    storage_bucket,
    storage_path,
    storage_public_url,
    content_type,
    byte_size,
    upload_status,
    upload_error,
    uploaded_at,
    updated_at,
    raw_payload
  ) values (
    v_p_code,
    v_own_code,
    nullif(btrim(p_original_file_name), ''),
    v_public_url,
    v_bucket,
    v_path,
    v_public_url,
    'image/jpeg',
    p_byte_size,
    'uploaded',
    null,
    now(),
    now(),
    jsonb_build_object('source', 'upload-product-image-edge-function')
  )
  on conflict (p_code) do update set
    own_code = coalesce(excluded.own_code, asset.sellpia_product_images.own_code),
    original_file_name = excluded.original_file_name,
    source_image_url = excluded.source_image_url,
    storage_bucket = excluded.storage_bucket,
    storage_path = excluded.storage_path,
    storage_public_url = excluded.storage_public_url,
    content_type = excluded.content_type,
    byte_size = excluded.byte_size,
    upload_status = 'uploaded',
    upload_error = null,
    uploaded_at = now(),
    updated_at = now(),
    raw_payload = coalesce(asset.sellpia_product_images.raw_payload, '{}'::jsonb) || excluded.raw_payload;

  insert into catalog.sellpia_products (
    p_code,
    own_code,
    legacy_image_url,
    legacy_image_source,
    source_system,
    source_project_ref,
    imported_at,
    updated_at,
    raw_payload
  ) values (
    v_p_code,
    v_own_code,
    null,
    'none',
    'System_v1_frontend_upload',
    'bpgvqmtsjgegnrdzmpep',
    now(),
    now(),
    jsonb_build_object('last_upload_path', v_path)
  )
  on conflict (p_code) do update set
    own_code = coalesce(excluded.own_code, catalog.sellpia_products.own_code),
    updated_at = now(),
    raw_payload = coalesce(catalog.sellpia_products.raw_payload, '{}'::jsonb) || jsonb_build_object('last_upload_path', v_path);

  return query
  select
    i.p_code,
    i.own_code,
    i.storage_bucket,
    i.storage_path,
    i.storage_public_url,
    i.upload_status
  from asset.sellpia_product_images i
  where i.p_code = v_p_code;
end;
$$;

revoke all on function public.upsert_uploaded_product_image(text,text,text,text,text,text,text,bigint) from public;
revoke all on function public.upsert_uploaded_product_image(text,text,text,text,text,text,text,bigint) from anon;
revoke all on function public.upsert_uploaded_product_image(text,text,text,text,text,text,text,bigint) from authenticated;
grant execute on function public.upsert_uploaded_product_image(text,text,text,text,text,text,text,bigint) to service_role;
