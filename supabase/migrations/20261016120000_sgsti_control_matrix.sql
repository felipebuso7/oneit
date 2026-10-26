-- Control matrix: connects ISO requirements, risks, operational controls and their test evidence.
create table public.sgsti_controls (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  process_id uuid references public.sgsti_processes(id) on delete set null,
  control_code text not null,
  title text not null check(length(trim(title)) between 3 and 240),
  control_description text not null check(length(trim(control_description)) between 10 and 10000),
  requirement_reference text,
  policy_reference text,
  risk_statement text,
  control_kind text not null check(control_kind in ('PREVENTIVE','DETECTIVE','CORRECTIVE','DIRECTIVE')),
  frequency text not null check(frequency in ('CONTINUOUS','DAILY','WEEKLY','MONTHLY','QUARTERLY','SEMIANNUAL','ANNUAL','ON_DEMAND')),
  owner_id uuid references public.user_profiles(id) on delete set null,
  test_method text,
  evidence_expectation text,
  next_test_at date,
  active boolean not null default true,
  created_by uuid not null references public.user_profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id, control_code)
);

create table public.sgsti_control_tests (
  id uuid primary key default gen_random_uuid(),
  control_id uuid not null references public.sgsti_controls(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  tested_at date not null default current_date,
  conclusion text not null check(conclusion in ('EFFECTIVE','PARTIALLY_EFFECTIVE','INEFFECTIVE','NOT_APPLICABLE')),
  finding_summary text,
  evidence_reference text,
  action_plan_id uuid references public.action_plans(id) on delete set null,
  tested_by uuid not null references public.user_profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index sgsti_controls_org_due_idx on public.sgsti_controls(organization_id, active, next_test_at);
create index sgsti_control_tests_control_idx on public.sgsti_control_tests(control_id, tested_at desc);
create trigger sgsti_controls_updated before update on public.sgsti_controls for each row execute function public.set_updated_at();

alter table public.sgsti_controls enable row level security;
alter table public.sgsti_control_tests enable row level security;
create policy "members read sgsti controls" on public.sgsti_controls for select to authenticated using(public.is_organization_member(organization_id));
create policy "members read sgsti control tests" on public.sgsti_control_tests for select to authenticated using(public.is_organization_member(organization_id));

create or replace function public.create_sgsti_control(
  target_organization_id uuid, target_control_code text, target_title text, target_description text,
  target_requirement_reference text default null, target_policy_reference text default null, target_risk_statement text default null,
  target_control_kind text default 'PREVENTIVE', target_frequency text default 'ANNUAL', target_owner_id uuid default null,
  target_test_method text default null, target_evidence_expectation text default null, target_next_test_at date default null
) returns uuid language plpgsql security definer set search_path=public as $$
declare control_id uuid;
begin
  if not public.has_sgsti_management_access(target_organization_id) then raise exception 'SGSTI_CONTROL_NOT_AUTHORIZED'; end if;
  if coalesce(length(trim(target_control_code)),0) not between 2 and 80 or coalesce(length(trim(target_title)),0) not between 3 and 240 or coalesce(length(trim(target_description)),0) not between 10 and 10000 then raise exception 'SGSTI_CONTROL_INVALID_INPUT'; end if;
  insert into public.sgsti_controls(organization_id,control_code,title,control_description,requirement_reference,policy_reference,risk_statement,control_kind,frequency,owner_id,test_method,evidence_expectation,next_test_at,created_by)
  values(target_organization_id,upper(trim(target_control_code)),trim(target_title),trim(target_description),nullif(trim(target_requirement_reference),''),nullif(trim(target_policy_reference),''),nullif(trim(target_risk_statement),''),target_control_kind,target_frequency,target_owner_id,nullif(trim(target_test_method),''),nullif(trim(target_evidence_expectation),''),target_next_test_at,auth.uid()) returning id into control_id;
  insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source) values(target_organization_id,auth.uid(),'SGSTI_CONTROL_CREATED','sgsti_control',control_id,jsonb_build_object('control_code',upper(trim(target_control_code))),'WEB');
  return control_id;
end; $$;

create or replace function public.record_sgsti_control_test(target_control_id uuid, target_tested_at date, target_conclusion text, target_finding_summary text default null, target_evidence_reference text default null, target_action_plan_id uuid default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare control_record public.sgsti_controls%rowtype; test_id uuid;
begin
  select * into control_record from public.sgsti_controls where id=target_control_id for update;
  if control_record.id is null or not public.has_sgsti_management_access(control_record.organization_id) then raise exception 'SGSTI_CONTROL_TEST_NOT_AUTHORIZED'; end if;
  if target_conclusion not in ('EFFECTIVE','PARTIALLY_EFFECTIVE','INEFFECTIVE','NOT_APPLICABLE') then raise exception 'SGSTI_CONTROL_TEST_INVALID_CONCLUSION'; end if;
  if target_conclusion in ('PARTIALLY_EFFECTIVE','INEFFECTIVE') and coalesce(length(trim(target_finding_summary)),0) < 10 then raise exception 'SGSTI_CONTROL_TEST_FINDING_REQUIRED'; end if;
  if coalesce(length(trim(target_evidence_reference)),0) < 3 then raise exception 'SGSTI_CONTROL_TEST_EVIDENCE_REQUIRED'; end if;
  insert into public.sgsti_control_tests(control_id,organization_id,tested_at,conclusion,finding_summary,evidence_reference,action_plan_id,tested_by) values(control_record.id,control_record.organization_id,coalesce(target_tested_at,current_date),target_conclusion,nullif(trim(target_finding_summary),''),trim(target_evidence_reference),target_action_plan_id,auth.uid()) returning id into test_id;
  update public.sgsti_controls set next_test_at = case frequency when 'DAILY' then coalesce(target_tested_at,current_date)+1 when 'WEEKLY' then coalesce(target_tested_at,current_date)+7 when 'MONTHLY' then (coalesce(target_tested_at,current_date)+interval '1 month')::date when 'QUARTERLY' then (coalesce(target_tested_at,current_date)+interval '3 months')::date when 'SEMIANNUAL' then (coalesce(target_tested_at,current_date)+interval '6 months')::date when 'ANNUAL' then (coalesce(target_tested_at,current_date)+interval '1 year')::date else next_test_at end where id=control_record.id;
  insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source) values(control_record.organization_id,auth.uid(),'SGSTI_CONTROL_TEST_RECORDED','sgsti_control_test',test_id,jsonb_build_object('control_id',control_record.id,'conclusion',target_conclusion),'WEB');
  return test_id;
end; $$;

revoke all on function public.create_sgsti_control(uuid,text,text,text,text,text,text,text,text,uuid,text,text,date) from public;
revoke all on function public.record_sgsti_control_test(uuid,date,text,text,text,uuid) from public;
grant execute on function public.create_sgsti_control(uuid,text,text,text,text,text,text,text,text,uuid,text,text,date) to authenticated;
grant execute on function public.record_sgsti_control_test(uuid,date,text,text,text,uuid) to authenticated;
