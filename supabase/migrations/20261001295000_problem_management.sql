create type public.problem_status as enum ('OPEN','INVESTIGATING','KNOWN_ERROR','RESOLVED','CLOSED');
create sequence public.problem_number_sequence start 1;
create or replace function public.next_problem_number() returns text language plpgsql volatile set search_path=public as $$ begin return format('PRB-%s-%s',to_char(current_date,'YYYY'),lpad(nextval('public.problem_number_sequence')::text,6,'0')); end; $$;
create table public.problems (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
 problem_number text not null unique default public.next_problem_number(), title text not null check(length(trim(title)) between 5 and 240), description text not null check(length(trim(description)) between 10 and 10000), priority smallint not null check(priority between 1 and 5), status public.problem_status not null default 'OPEN', workaround text, root_cause text, opened_by uuid not null references public.user_profiles(id) on delete restrict, owner_id uuid references public.user_profiles(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), closed_at timestamptz
);
create index problems_organization_status_idx on public.problems(organization_id,status,created_at desc);
create trigger problems_updated before update on public.problems for each row execute function public.set_updated_at();
alter table public.problems enable row level security;
create policy "management reads problems" on public.problems for select to authenticated using(public.has_ticket_management_role(organization_id));
create or replace function public.create_problem_from_ticket(target_ticket_id uuid,target_title text,target_description text,target_priority smallint)
returns uuid language plpgsql security definer set search_path=public as $$
declare ticket public.tickets%rowtype; problem_id uuid;
begin
 select * into ticket from public.tickets where id=target_ticket_id for update;
 if ticket.id is null or not public.has_ticket_management_role(ticket.organization_id) then raise exception 'PROBLEM_NOT_AUTHORIZED'; end if;
 if length(trim(target_title)) not between 5 and 240 or length(trim(target_description)) not between 10 and 10000 or target_priority not between 1 and 5 then raise exception 'PROBLEM_INVALID_INPUT'; end if;
 insert into public.problems(organization_id,title,description,priority,opened_by) values(ticket.organization_id,trim(target_title),trim(target_description),target_priority,auth.uid()) returning id into problem_id;
 insert into public.entity_relationships(organization_id,source_entity_type,source_entity_id,target_entity_type,target_entity_id,relationship_type,reason,created_by) values(ticket.organization_id,'TICKET',ticket.id,'PROBLEM',problem_id,'CAUSED_BY','Problema registrado a partir do chamado.',auth.uid());
 insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source) values(ticket.organization_id,auth.uid(),'PROBLEM_CREATED','problem',problem_id,jsonb_build_object('ticket_id',ticket.id),'WEB');
 return problem_id;
end; $$;
revoke all on function public.create_problem_from_ticket(uuid,text,text,smallint) from public; grant execute on function public.create_problem_from_ticket(uuid,text,text,smallint) to authenticated;
