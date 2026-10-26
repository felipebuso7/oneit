create table public.known_errors (
 id uuid primary key default gen_random_uuid(), problem_id uuid not null unique references public.problems(id) on delete restrict, organization_id uuid not null references public.organizations(id) on delete restrict,
 title text not null check(length(trim(title)) between 5 and 240), symptom text not null check(length(trim(symptom)) between 10 and 10000), workaround text not null check(length(trim(workaround)) between 10 and 10000), status text not null default 'PUBLISHED' check(status in ('DRAFT','PUBLISHED','RETIRED')), created_by uuid not null references public.user_profiles(id) on delete restrict, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create trigger known_errors_updated before update on public.known_errors for each row execute function public.set_updated_at(); alter table public.known_errors enable row level security;
create policy "management reads known errors" on public.known_errors for select to authenticated using(public.has_ticket_management_role(organization_id));
create or replace function public.create_known_error(target_problem_id uuid,target_title text,target_symptom text,target_workaround text) returns uuid language plpgsql security definer set search_path=public as $$
declare p public.problems%rowtype; known_id uuid;
begin select * into p from public.problems where id=target_problem_id for update; if p.id is null or not public.has_ticket_management_role(p.organization_id) then raise exception 'KNOWN_ERROR_NOT_AUTHORIZED'; end if;
 if length(trim(target_title)) not between 5 and 240 or length(trim(target_symptom)) not between 10 and 10000 or length(trim(target_workaround)) not between 10 and 10000 then raise exception 'KNOWN_ERROR_INVALID_INPUT'; end if;
 insert into public.known_errors(problem_id,organization_id,title,symptom,workaround,created_by) values(p.id,p.organization_id,trim(target_title),trim(target_symptom),trim(target_workaround),auth.uid()) returning id into known_id;
 update public.problems set status='KNOWN_ERROR',workaround=trim(target_workaround) where id=p.id;
 insert into public.entity_relationships(organization_id,source_entity_type,source_entity_id,target_entity_type,target_entity_id,relationship_type,reason,created_by) values(p.organization_id,'PROBLEM',p.id,'KNOWN_ERROR',known_id,'PUBLISHED_AS','Workaround publicado.',auth.uid());
 insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source) values(p.organization_id,auth.uid(),'KNOWN_ERROR_PUBLISHED','known_error',known_id,jsonb_build_object('problem_id',p.id),'WEB'); return known_id; end; $$;
revoke all on function public.create_known_error(uuid,text,text,text) from public; grant execute on function public.create_known_error(uuid,text,text,text) to authenticated;
