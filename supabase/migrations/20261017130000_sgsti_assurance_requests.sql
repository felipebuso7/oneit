create table public.sgsti_assurance_requests(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete restrict,control_id uuid references public.sgsti_controls(id) on delete set null,title text not null check(length(trim(title)) between 5 and 240),requirement_reference text,request_note text not null check(length(trim(request_note)) between 10 and 10000),responsible_id uuid not null references public.user_profiles(id) on delete restrict,due_at date not null,status text not null default 'OPEN' check(status in ('OPEN','EVIDENCE_SUBMITTED','ACCEPTED','RETURNED','OVERDUE','CANCELLED')),evidence_reference text,evidence_note text,requested_by uuid not null references public.user_profiles(id) on delete restrict,requested_at timestamptz not null default now(),submitted_at timestamptz,reviewed_by uuid references public.user_profiles(id) on delete set null,reviewed_at timestamptz,review_comment text,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index sgsti_assurance_org_status_due_idx on public.sgsti_assurance_requests(organization_id,status,due_at);
create index sgsti_assurance_responsible_idx on public.sgsti_assurance_requests(responsible_id,status,due_at);
create trigger sgsti_assurance_requests_updated before update on public.sgsti_assurance_requests for each row execute function public.set_updated_at();
alter table public.sgsti_assurance_requests enable row level security;
create policy "members read assurance requests" on public.sgsti_assurance_requests for select to authenticated using(public.is_organization_member(organization_id));

create or replace function public.create_sgsti_assurance_request(target_organization_id uuid,target_control_id uuid,target_title text,target_requirement text,target_note text,target_responsible_id uuid,target_due_at date) returns uuid language plpgsql security definer set search_path=public as $$
declare request_id uuid;
begin
 if not (public.has_sgsti_role(target_organization_id,'AUDITOR') or public.has_organization_role(target_organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER','AUDITOR']::public.platform_role[])) then raise exception 'SGSTI_ASSURANCE_NOT_AUTHORIZED'; end if;
 if coalesce(length(trim(target_title)),0) not between 5 and 240 or coalesce(length(trim(target_note)),0) not between 10 and 10000 or target_due_at<current_date-1 then raise exception 'SGSTI_ASSURANCE_INVALID_INPUT'; end if;
 insert into public.sgsti_assurance_requests(organization_id,control_id,title,requirement_reference,request_note,responsible_id,due_at,requested_by) values(target_organization_id,target_control_id,trim(target_title),nullif(trim(target_requirement),''),trim(target_note),target_responsible_id,target_due_at,auth.uid()) returning id into request_id;
 insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source) values(target_organization_id,auth.uid(),'SGSTI_ASSURANCE_REQUEST_CREATED','sgsti_assurance_request',request_id,jsonb_build_object('responsible_id',target_responsible_id,'due_at',target_due_at),'WEB'); return request_id;
end; $$;

create or replace function public.submit_sgsti_assurance_evidence(target_request_id uuid,target_reference text,target_note text default null) returns void language plpgsql security definer set search_path=public as $$
declare request_record public.sgsti_assurance_requests%rowtype;
begin
 select * into request_record from public.sgsti_assurance_requests where id=target_request_id for update;
 if request_record.id is null or not (request_record.responsible_id=auth.uid() or public.has_sgsti_management_access(request_record.organization_id)) then raise exception 'SGSTI_ASSURANCE_SUBMIT_NOT_AUTHORIZED'; end if;
 if request_record.status not in ('OPEN','OVERDUE','RETURNED') or coalesce(length(trim(target_reference)),0)<3 then raise exception 'SGSTI_ASSURANCE_SUBMIT_INVALID'; end if;
 update public.sgsti_assurance_requests set status='EVIDENCE_SUBMITTED',evidence_reference=trim(target_reference),evidence_note=nullif(trim(target_note),''),submitted_at=clock_timestamp(),reviewed_by=null,reviewed_at=null,review_comment=null where id=request_record.id;
 insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source) values(request_record.organization_id,auth.uid(),'SGSTI_ASSURANCE_EVIDENCE_SUBMITTED','sgsti_assurance_request',request_record.id,jsonb_build_object('reference',trim(target_reference)),'WEB');
end; $$;

create or replace function public.decide_sgsti_assurance_request(target_request_id uuid,target_decision text,target_comment text default null) returns void language plpgsql security definer set search_path=public as $$
declare request_record public.sgsti_assurance_requests%rowtype;
begin
 select * into request_record from public.sgsti_assurance_requests where id=target_request_id for update;
 if request_record.id is null or not (public.has_sgsti_role(request_record.organization_id,'AUDITOR') or public.has_organization_role(request_record.organization_id,array['SUPER_ADMIN','ORG_ADMIN','MANAGER','AUDITOR']::public.platform_role[])) then raise exception 'SGSTI_ASSURANCE_REVIEW_NOT_AUTHORIZED'; end if;
 if request_record.status<>'EVIDENCE_SUBMITTED' or request_record.requested_by=auth.uid() or request_record.responsible_id=auth.uid() then raise exception 'SGSTI_ASSURANCE_REVIEW_SEGREGATION_REQUIRED'; end if;
 if target_decision not in ('ACCEPT','RETURN') or (target_decision='RETURN' and coalesce(length(trim(target_comment)),0)<10) then raise exception 'SGSTI_ASSURANCE_DECISION_INVALID'; end if;
 update public.sgsti_assurance_requests set status=case when target_decision='ACCEPT' then 'ACCEPTED' else 'RETURNED' end,reviewed_by=auth.uid(),reviewed_at=clock_timestamp(),review_comment=nullif(trim(target_comment),'') where id=request_record.id;
 insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source) values(request_record.organization_id,auth.uid(),case when target_decision='ACCEPT' then 'SGSTI_ASSURANCE_ACCEPTED' else 'SGSTI_ASSURANCE_RETURNED' end,'sgsti_assurance_request',request_record.id,jsonb_build_object('decision',target_decision),'WEB');
end; $$;
revoke all on function public.create_sgsti_assurance_request(uuid,uuid,text,text,text,uuid,date),public.submit_sgsti_assurance_evidence(uuid,text,text),public.decide_sgsti_assurance_request(uuid,text,text) from public;
grant execute on function public.create_sgsti_assurance_request(uuid,uuid,text,text,text,uuid,date),public.submit_sgsti_assurance_evidence(uuid,text,text),public.decide_sgsti_assurance_request(uuid,text,text) to authenticated;

create or replace function public.list_sgsti_assignable_users(target_organization_ids uuid[])
returns table(organization_id uuid,user_id uuid,full_name text) language sql security definer set search_path=public as $$
 select distinct role.organization_id,profile.id,profile.full_name from public.user_roles role join public.user_profiles profile on profile.id=role.user_id
 where role.organization_id=any(target_organization_ids) and profile.active and public.is_organization_member(role.organization_id);
$$;
revoke all on function public.list_sgsti_assignable_users(uuid[]) from public;
grant execute on function public.list_sgsti_assignable_users(uuid[]) to authenticated;
