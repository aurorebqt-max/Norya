-- Private per-user backup bucket. Execute in NORYA's Supabase SQL Editor.
insert into storage.buckets (id,name,public,file_size_limit) values ('norya-device-backups','norya-device-backups',false,52428800)
on conflict (id) do update set public=false;
drop policy if exists "norya device backup upload" on storage.objects;
create policy "norya device backup upload" on storage.objects for insert to authenticated
with check (bucket_id='norya-device-backups' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "norya device backup download" on storage.objects;
create policy "norya device backup download" on storage.objects for select to authenticated
using (bucket_id='norya-device-backups' and (storage.foldername(name))[1]=auth.uid()::text);
