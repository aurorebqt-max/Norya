-- Apply in the Translate project ONLY after review and a database backup.
-- No data deletion, no public policies, no automatic human validation.
-- Apply this migration before strict-publication.patch.
create or replace function public.publish_validated_translation(
  p_job_id uuid, p_source_revision text, p_translations jsonb
) returns void language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  job public.translation_jobs%rowtype;
  expected integer;
begin
  select * into job from public.translation_jobs where id = p_job_id for update;
  if not found then raise exception 'Unknown job'; end if;
  if p_source_revision is distinct from job.source_revision then raise exception 'Stale revision'; end if;
  if jsonb_typeof(p_translations) is distinct from 'array' then raise exception 'Array required'; end if;
  expected := jsonb_array_length(job.source_json->'blocks');
  if expected < 1 or jsonb_array_length(p_translations) <> expected then raise exception 'Incomplete translation'; end if;
  if (select count(distinct t->>'id') from jsonb_array_elements(p_translations) t) <> expected then
    raise exception 'Duplicate translation';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_translations) t
    where t->'validated' is distinct from 'true'::jsonb
      or jsonb_typeof(t->'text') is distinct from 'string'
      or btrim(t->>'text') = '' or length(t->>'text') > 30000
      or not exists (select 1 from jsonb_array_elements(job.source_json->'blocks') b where b->>'id' = t->>'id')
  ) then raise exception 'Invalid or unreviewed translation'; end if;
  insert into public.chapter_translations(chapter_id, source_revision, job_id, translations, updated_at)
    values(job.chapter_id, job.source_revision, job.id, p_translations, now())
    on conflict(chapter_id, source_revision) do update set
      job_id = excluded.job_id, translations = excluded.translations, updated_at = excluded.updated_at;
  update public.translation_jobs set status = 'complete', completed_at = now() where id = job.id;
end;
$$;
revoke all on function public.publish_validated_translation(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.publish_validated_translation(uuid, text, jsonb) to service_role;
