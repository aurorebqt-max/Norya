-- Norya QCM: run once in Supabase SQL Editor. No PDF/book content is uploaded by this migration.
create table if not exists public.norya_content_editors (
 user_id uuid primary key references auth.users(id) on delete cascade
);
create table if not exists public.norya_qcm (
 id text primary key,
 chapter_ids text[] not null default '{}',
 payload jsonb not null,
 published boolean not null default false,
 updated_at timestamptz not null default now(),
 updated_by uuid references auth.users(id),
 constraint norya_qcm_id_length check (length(id) between 1 and 160),
 constraint norya_qcm_payload_size check (octet_length(payload::text) < 100000)
);
create index if not exists norya_qcm_chapters_idx on public.norya_qcm using gin(chapter_ids);
alter table public.norya_content_editors enable row level security;
alter table public.norya_qcm enable row level security;
revoke all on public.norya_content_editors from anon, authenticated;
grant select on public.norya_content_editors to authenticated;
grant select, insert, update, delete on public.norya_qcm to authenticated;
drop policy if exists norya_editor_self on public.norya_content_editors;
create policy norya_editor_self on public.norya_content_editors for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists norya_qcm_read on public.norya_qcm;
create policy norya_qcm_read on public.norya_qcm for select to authenticated using (
 published or exists(select 1 from public.norya_content_editors e where e.user_id = (select auth.uid()))
);
drop policy if exists norya_qcm_insert on public.norya_qcm;
create policy norya_qcm_insert on public.norya_qcm for insert to authenticated with check (
 updated_by = (select auth.uid()) and exists(select 1 from public.norya_content_editors e where e.user_id = (select auth.uid()))
);
drop policy if exists norya_qcm_update on public.norya_qcm;
create policy norya_qcm_update on public.norya_qcm for update to authenticated using (
 exists(select 1 from public.norya_content_editors e where e.user_id = (select auth.uid()))
) with check (updated_by = (select auth.uid()) and exists(select 1 from public.norya_content_editors e where e.user_id = (select auth.uid())));
drop policy if exists norya_qcm_delete on public.norya_qcm;
create policy norya_qcm_delete on public.norya_qcm for delete to authenticated using (
 exists(select 1 from public.norya_content_editors e where e.user_id = (select auth.uid()))
);
-- Grant yourself editor access ONLY from the Supabase SQL editor, after signing up:
-- insert into public.norya_content_editors(user_id)
-- select id from auth.users where email = 'YOUR_ACCOUNT_EMAIL' on conflict do nothing;
-- Verify the account email before executing the statement. Never expose a privileged key in Vercel.
