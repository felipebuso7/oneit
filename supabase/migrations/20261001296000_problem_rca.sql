create table public.problem_rcas (
 id uuid primary key default gen_random_uuid(), problem_id uuid not null unique references public.problems(id) on delete restrict,
 organization_id uuid not null references public.organizations(id) on delete restrict, method text not null check(method in ('FIVE_WHYS','ISHIKAWA','CHRONOLOGY','FREEFORM')), direct_cause text not null check(length(trim(direct_cause)) between 10 and 10000), contributing_cause text, root_cause text not null check(length(trim(root_cause)) between 10 and 10000), status text not null default 'DRAFT' check(status in ('DRAFT','COMPLETED','EFFECTIVENESS_VERIFIED')), effectiveness_result text, created_by uuid not null references public.user_profiles(id) on delete restrict, verified_by uuid references public.user_profiles(id) on delete restrict, created_at timestamptz not null default now(), verified_at timestamptz
);
alter table public.problem_rcas enable row level security;
create policy "management reads problem rcas" on public.problem_rcas for select to authenticated using(public.has_ticket_management_role(organization_id));
create or replace function public.create_problem_rca(target_problem_id uuid,target_method text,target_direct_cause text,target_contributing_cause text,target_root_cause text)
returns uuid language plpgsql security definer set search_path=public as $$
declare p public.problems%rowtype; rca_id uuid;
begin select * into p from public.problems where id=target_problem_id for update;
 if p.id is null or not public.has_ticket_management_role(p.organization_id) then raise exception 'RCA_NOT_AUTHORIZED'; end if;
 if target_method not in ('FIVE_WHYS','ISHIKAWA','CHRONOLOGY','FREEFORM') or length(trim(target_direct_cause)) not between 10 and 10000 or length(trim(target_root_cause)) not between 10 and 10000 then raise exception 'RCA_INVALID_INPUT'; end if;
 insert into public.problem_rcas(problem_id,organization_id,method,direct_cause,contributing_cause,root_cause,created_by) values(p.id,p.organization_id,target_method,trim(target_direct_cause),nullif(trim(target_contributing_cause),''),trim(target_root_cause),auth.uid()) returning id into rca_id;
 insert into public.entity_relationships(organization_id,source_entity_type,source_entity_id,target_entity_type,target_entity_id,relationship_type,reason,created_by) values(p.organization_id,'PROBLEM',p.id,'RCA',rca_id,'ANALYZED_BY','RCA registrada para o problema.',auth.uid());
 insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source) values(p.organization_id,auth.uid(),'PROBLEM_RCA_CREATED','problem_rca',rca_id,jsonb_build_object('problem_id',p.id,'method',target_method),'WEB'); return rca_id; end; $$;
revoke all on function public.create_problem_rca(uuid,text,text,text,text) from public; grant execute on function public.create_problem_rca(uuid,text,text,text,text) to authenticated;
