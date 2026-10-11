-- ============================================================
-- Open Market — Storage para capturas de gráficos
-- Bucket privado. Convención de ruta: <user_id>/<trade_id>/<archivo>
-- El primer segmento de la ruta es el que aísla a cada usuario.
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'trade-captures',
  'trade-captures',
  false,
  5242880, -- 5 MB
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update
  set file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists trade_captures_select on storage.objects;
create policy trade_captures_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'trade-captures'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists trade_captures_insert on storage.objects;
create policy trade_captures_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'trade-captures'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists trade_captures_update on storage.objects;
create policy trade_captures_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'trade-captures'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists trade_captures_delete on storage.objects;
create policy trade_captures_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'trade-captures'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
