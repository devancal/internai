-- Transaction-only integration check: all synthetic rows roll back. Apply the migration first.
begin;
insert into auth.users(id,email) values ('11111111-1111-4111-8111-111111111119','internai-transaction-test@example.invalid');
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111119',true);
set local role authenticated;
do $$
declare first_save jsonb; second_save jsonb; caught boolean := false;
begin
 first_save := public.save_intern_workspace('{"name": "Synthetic sync test", "personal_email": "", "school_email": "", "school": "", "major": "", "grad": "", "gpa": "", "location": "", "work_preference": "", "summary": "", "resume_text": "", "resume_filename": "", "skills": [], "evidence": [], "career_graph": {}, "user_id": "ffffffff-ffff-ffff-ffff-ffffffffffff"}'::jsonb, '[]', '[]', (select updated_at from public.profiles where user_id=auth.uid()), (select updated_at from public.user_state where user_id=auth.uid()));
 if not exists(select 1 from public.profiles where user_id=auth.uid() and name='Synthetic sync test') then raise exception 'Own row missing'; end if;
 if exists(select 1 from public.profiles where user_id='ffffffff-ffff-ffff-ffff-ffffffffffff') then raise exception 'Foreign owner accepted'; end if;
 second_save := public.save_intern_workspace('{"name": "Synthetic sync test", "personal_email": "", "school_email": "", "school": "", "major": "", "grad": "", "gpa": "", "location": "", "work_preference": "", "summary": "", "resume_text": "", "resume_filename": "", "skills": [], "evidence": [], "career_graph": {}, "user_id": "ffffffff-ffff-ffff-ffff-ffffffffffff"}'::jsonb, '["saved"]', '[]', (first_save->>'profile')::timestamptz, (first_save->>'state')::timestamptz);
 if first_save=second_save then raise exception 'Version did not advance'; end if;
 begin
  perform public.save_intern_workspace('{"name": "Synthetic sync test", "personal_email": "", "school_email": "", "school": "", "major": "", "grad": "", "gpa": "", "location": "", "work_preference": "", "summary": "", "resume_text": "", "resume_filename": "", "skills": [], "evidence": [], "career_graph": {}, "user_id": "ffffffff-ffff-ffff-ffff-ffffffffffff"}'::jsonb, '["stale"]', '[]', (first_save->>'profile')::timestamptz, (first_save->>'state')::timestamptz);
 exception when sqlstate 'PT409' then caught := true;
 end;
 if not caught then raise exception 'Stale save accepted'; end if;
 if (select saved from public.user_state where user_id=auth.uid()) <> '["saved"]'::jsonb then raise exception 'Stale save changed data'; end if;
 if has_function_privilege('anon','public.save_intern_workspace(jsonb,jsonb,jsonb,timestamptz,timestamptz)','EXECUTE') then raise exception 'Anon can execute'; end if;
end;
$$;
reset role;
select 'atomic saves, version increments, stale rejection, ownership and anon permissions passed' as verification;

rollback;
