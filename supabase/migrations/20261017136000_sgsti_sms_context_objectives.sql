create table public.sgsti_sms_profiles(
 organization_id uuid primary key references public.organizations(id) on delete cascade,
 scope_statement text not null check(length(trim(scope_statement)) between 20 and 10000),
 boundaries text,
 interested_parties text,
 service_management_plan_url text,
 last_reviewed_at date not null default current_date,
 reviewed_by uuid references public.user_profiles(id) on delete set null,
 updated_at timestamptz not null default now()
);
create table public.sgsti_objectives(
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
 objective text not null check(length(trim(objective)) between 10 and 1000), metric_definition text not null check(length(trim(metric_definition)) between 5 and 4000), target_value text not null check(length(trim(target_value)) between 1 and 500), measurement_frequency text not null check(measurement_frequency in ('MONTHLY','QUARTERLY','SEMIANNUAL','ANNUAL')),
 owner_id uuid references public.user_profiles(id) on delete set null, review_at date, current_value text, status text not null default 'ACTIVE' check(status in ('ACTIVE','AT_RISK','ACHIEVED','CANCELLED')), created_by uuid references public.user_profiles(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index sgsti_objectives_org_status_idx on public.sgsti_objectives(organization_id,status,review_at);
create trigger sgsti_sms_profiles_updated before update on public.sgsti_sms_profiles for each row execute function public.set_updated_at();
create trigger sgsti_objectives_updated before update on public.sgsti_objectives for each row execute function public.set_updated_at();
alter table public.sgsti_sms_profiles enable row level security; alter table public.sgsti_objectives enable row level security;
create policy "members read sms profile" on public.sgsti_sms_profiles for select to authenticated using(public.is_organization_member(organization_id));
create policy "members read sgsti objectives" on public.sgsti_objectives for select to authenticated using(public.is_organization_member(organization_id));
create policy "sgsti managers manage sms profile" on public.sgsti_sms_profiles for all to authenticated using(public.has_sgsti_management_access(organization_id)) with check(public.has_sgsti_management_access(organization_id));
create policy "sgsti managers manage objectives" on public.sgsti_objectives for all to authenticated using(public.has_sgsti_management_access(organization_id)) with check(public.has_sgsti_management_access(organization_id));
create or replace function public.save_sgsti_sms_profile(target_organization_id uuid,target_scope text,target_boundaries text,target_parties text,target_plan_url text default null) returns void language plpgsql security definer set search_path=public as $$ begin if not public.has_sgsti_management_access(target_organization_id) or coalesce(length(trim(target_scope)),0) not between 20 and 10000 then raise exception 'SGSTI_SMS_PROFILE_INVALID_OR_UNAUTHORIZED'; end if; insert into public.sgsti_sms_profiles(organization_id,scope_statement,boundaries,interested_parties,service_management_plan_url,reviewed_by) values(target_organization_id,trim(target_scope),nullif(trim(target_boundaries),''),nullif(trim(target_parties),''),nullif(trim(target_plan_url),''),auth.uid()) on conflict(organization_id) do update set scope_statement=excluded.scope_statement,boundaries=excluded.boundaries,interested_parties=excluded.interested_parties,service_management_plan_url=excluded.service_management_plan_url,last_reviewed_at=current_date,reviewed_by=auth.uid(); insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,source) values(target_organization_id,auth.uid(),'SGSTI_SMS_PROFILE_SAVED','sgsti_sms_profile',target_organization_id,'WEB'); end; $$;
revoke all on function public.save_sgsti_sms_profile(uuid,text,text,text,text) from public; grant execute on function public.save_sgsti_sms_profile(uuid,text,text,text,text) to authenticated;

create or replace function public.create_sgsti_objective(
 target_organization_id uuid,target_objective text,target_metric_definition text,target_target_value text,
 target_measurement_frequency text,target_owner_id uuid default null,target_review_at date default null
) returns uuid language plpgsql security definer set search_path=public as $$
declare objective_id uuid;
begin
 if not public.has_sgsti_management_access(target_organization_id) then raise exception 'SGSTI_OBJECTIVE_NOT_AUTHORIZED'; end if;
 if coalesce(length(trim(target_objective)),0) not between 10 and 1000 or coalesce(length(trim(target_metric_definition)),0) not between 5 and 4000 or coalesce(length(trim(target_target_value)),0) not between 1 and 500 or target_measurement_frequency not in ('MONTHLY','QUARTERLY','SEMIANNUAL','ANNUAL') then raise exception 'SGSTI_OBJECTIVE_INVALID_INPUT'; end if;
 if target_owner_id is not null and not exists(select 1 from public.user_roles where organization_id=target_organization_id and user_id=target_owner_id) then raise exception 'SGSTI_OBJECTIVE_OWNER_INVALID'; end if;
 insert into public.sgsti_objectives(organization_id,objective,metric_definition,target_value,measurement_frequency,owner_id,review_at,created_by)
 values(target_organization_id,trim(target_objective),trim(target_metric_definition),trim(target_target_value),target_measurement_frequency,target_owner_id,target_review_at,auth.uid()) returning id into objective_id;
 insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source) values(target_organization_id,auth.uid(),'SGSTI_OBJECTIVE_CREATED','sgsti_objective',objective_id,jsonb_build_object('frequency',target_measurement_frequency,'target',target_target_value),'WEB');
 return objective_id;
end; $$;

create or replace function public.update_sgsti_objective_measurement(
 target_objective_id uuid,target_current_value text,target_status text,target_review_at date default null
) returns void language plpgsql security definer set search_path=public as $$
declare item public.sgsti_objectives%rowtype;
begin
 select * into item from public.sgsti_objectives where id=target_objective_id for update;
 if item.id is null or not public.has_sgsti_management_access(item.organization_id) then raise exception 'SGSTI_OBJECTIVE_NOT_AUTHORIZED'; end if;
 if coalesce(length(trim(target_current_value)),0)>500 or target_status not in ('ACTIVE','AT_RISK','ACHIEVED','CANCELLED') then raise exception 'SGSTI_OBJECTIVE_MEASUREMENT_INVALID'; end if;
 update public.sgsti_objectives set current_value=nullif(trim(target_current_value),''),status=target_status,review_at=coalesce(target_review_at,review_at) where id=item.id;
 insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source) values(item.organization_id,auth.uid(),'SGSTI_OBJECTIVE_MEASURED','sgsti_objective',item.id,jsonb_build_object('status',target_status,'current_value',target_current_value),'WEB');
end; $$;
revoke all on function public.create_sgsti_objective(uuid,text,text,text,text,uuid,date), public.update_sgsti_objective_measurement(uuid,text,text,date) from public;
grant execute on function public.create_sgsti_objective(uuid,text,text,text,text,uuid,date), public.update_sgsti_objective_measurement(uuid,text,text,date) to authenticated;
