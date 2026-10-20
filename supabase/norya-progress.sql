-- À exécuter une seule fois dans SQL Editor du projet Supabase NORYA.
-- Chaque personne ne peut lire et modifier que SA sauvegarde.
create table if not exists public.norya_progress_backups (
 user_id uuid primary key references auth.users(id) on delete cascade,
 payload jsonb not null,
 updated_at timestamptz not null default now()
);
alter table public.norya_progress_backups enable row level security;
revoke all on public.norya_progress_backups from anon;
grant select,insert,update on public.norya_progress_backups to authenticated;
drop policy if exists "select own progress" on public.norya_progress_backups;
create policy "select own progress" on public.norya_progress_backups for select to authenticated using (auth.uid() = user_id);
drop policy if exists "insert own progress" on public.norya_progress_backups;
create policy "insert own progress" on public.norya_progress_backups for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "update own progress" on public.norya_progress_backups;
create policy "update own progress" on public.norya_progress_backups for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
