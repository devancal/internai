-- Atomic optimistic concurrency for the two existing workspace rows.
-- Apply through Supabase migration workspace_atomic_sync; no user rows are migrated.
create or replace function public.intern_workspace_timestamp()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at := case when TG_OP = 'UPDATE' then greatest(clock_timestamp(), old.updated_at + interval '1 microsecond') else clock_timestamp() end;
  return new;
end;
$$;
revoke all on function public.intern_workspace_timestamp() from public, anon;
create trigger intern_profiles_timestamp before insert or update on public.profiles
for each row execute function public.intern_workspace_timestamp();
create trigger intern_state_timestamp before insert or update on public.user_state
for each row execute function public.intern_workspace_timestamp();

create or replace function public.save_intern_workspace(
  profile_data jsonb, saved_data jsonb, applications_data jsonb,
  expected_profile timestamptz, expected_state timestamptz
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  profile_version timestamptz;
  state_version timestamptz;
  incoming public.profiles;
  has_profile boolean;
  has_state boolean;
begin
  if owner_id is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  if jsonb_typeof(profile_data) is distinct from 'object'
    or jsonb_typeof(saved_data) is distinct from 'array'
    or jsonb_typeof(applications_data) is distinct from 'array' then
    raise exception 'Invalid workspace' using errcode = '22023';
  end if;
  -- Serializes initial saves as well as updates; hash collisions only cause waiting.
  perform pg_advisory_xact_lock(hashtextextended(owner_id::text, 0));
  select updated_at into profile_version from public.profiles where user_id = owner_id for update;
  has_profile := found;
  select updated_at into state_version from public.user_state where user_id = owner_id for update;
  has_state := found;
  if profile_version is distinct from expected_profile or state_version is distinct from expected_state then
    raise exception 'Workspace changed on another device' using errcode = 'PT409';
  end if;
  incoming := jsonb_populate_record(null::public.profiles, profile_data);
  if has_profile then
    update public.profiles set name = incoming.name, personal_email = incoming.personal_email, school_email = incoming.school_email, school = incoming.school, major = incoming.major, grad = incoming.grad, gpa = incoming.gpa, location = incoming.location, work_preference = incoming.work_preference, summary = incoming.summary, skills = incoming.skills, resume_text = incoming.resume_text, resume_filename = incoming.resume_filename, evidence = incoming.evidence, career_graph = incoming.career_graph where user_id = owner_id returning updated_at into profile_version;
  else
    insert into public.profiles (user_id, name, personal_email, school_email, school, major, grad, gpa, location, work_preference, summary, skills, resume_text, resume_filename, evidence, career_graph) values (owner_id, incoming.name, incoming.personal_email, incoming.school_email, incoming.school, incoming.major, incoming.grad, incoming.gpa, incoming.location, incoming.work_preference, incoming.summary, incoming.skills, incoming.resume_text, incoming.resume_filename, incoming.evidence, incoming.career_graph) returning updated_at into profile_version;
  end if;
  if has_state then
    update public.user_state set saved = saved_data, applications = applications_data
    where user_id = owner_id returning updated_at into state_version;
  else
    insert into public.user_state (user_id, saved, applications) values (owner_id, saved_data, applications_data)
    returning updated_at into state_version;
  end if;
  return jsonb_build_object('profile', profile_version, 'state', state_version);
exception when unique_violation then
  raise exception 'Workspace changed on another device' using errcode = 'PT409';
end;
$$;
revoke all on function public.save_intern_workspace(jsonb,jsonb,jsonb,timestamptz,timestamptz) from public, anon;
grant execute on function public.save_intern_workspace(jsonb,jsonb,jsonb,timestamptz,timestamptz) to authenticated;
