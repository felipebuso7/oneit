-- Estrutura os insumos da análise crítica. A conclusão só é permitida após o
-- registro dos temas mínimos; o conteúdo continua sujeito à avaliação humana.
create type public.management_review_input_kind as enum (
 'SERVICE_PERFORMANCE','CUSTOMER_FEEDBACK','AUDITS_AND_NC','RISKS_OPPORTUNITIES',
 'SUPPLIERS','OBJECTIVES_AND_RESOURCES','PREVIOUS_ACTIONS','IMPROVEMENT_OPPORTUNITIES'
);
create table public.management_review_inputs (
 id uuid primary key default gen_random_uuid(), review_id uuid not null references public.management_reviews(id) on delete cascade,
 organization_id uuid not null references public.organizations(id) on delete restrict,
 input_kind public.management_review_input_kind not null, summary text not null check(length(trim(summary)) between 10 and 10000),
 evidence_reference text, recorded_by uuid not null references public.user_profiles(id) on delete restrict, recorded_at timestamptz not null default clock_timestamp(),
 unique(review_id,input_kind)
);
create index management_review_inputs_review_idx on public.management_review_inputs(review_id,input_kind);
alter table public.management_review_inputs enable row level security;
create policy "governance reads management review inputs" on public.management_review_inputs for select to authenticated using(public.has_sgsti_management_access(organization_id));

create or replace function public.save_management_review_input(target_review_id uuid,target_kind public.management_review_input_kind,target_summary text,target_evidence_reference text default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare review public.management_reviews%rowtype; input_id uuid;
begin
 select * into review from public.management_reviews where id=target_review_id for update;
 if review.id is null or not public.has_sgsti_management_access(review.organization_id) then raise exception 'MANAGEMENT_REVIEW_INPUT_NOT_AUTHORIZED'; end if;
 if review.status='COMPLETED' or coalesce(length(trim(target_summary)),0) not between 10 and 10000 then raise exception 'MANAGEMENT_REVIEW_INPUT_INVALID'; end if;
 insert into public.management_review_inputs(review_id,organization_id,input_kind,summary,evidence_reference,recorded_by)
 values(review.id,review.organization_id,target_kind,trim(target_summary),nullif(trim(target_evidence_reference),''),auth.uid())
 on conflict(review_id,input_kind) do update set summary=excluded.summary,evidence_reference=excluded.evidence_reference,recorded_by=auth.uid(),recorded_at=clock_timestamp()
 returning id into input_id;
 update public.management_reviews set status='IN_PROGRESS' where id=review.id and status='SCHEDULED';
 insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source) values(review.organization_id,auth.uid(),'MANAGEMENT_REVIEW_INPUT_SAVED','management_review',review.id,jsonb_build_object('input_kind',target_kind),'WEB');
 return input_id;
end; $$;

create or replace function public.complete_management_review(target_review_id uuid,target_conclusion text)
returns void language plpgsql security definer set search_path=public as $$
declare review public.management_reviews%rowtype; required_count integer;
begin
 select * into review from public.management_reviews where id=target_review_id for update;
 if review.id is null or not public.has_sgsti_management_access(review.organization_id) then raise exception 'MANAGEMENT_REVIEW_NOT_AUTHORIZED'; end if;
 if review.status='COMPLETED' then raise exception 'MANAGEMENT_REVIEW_ALREADY_COMPLETED'; end if;
 if coalesce(length(trim(target_conclusion)),0) not between 10 and 10000 then raise exception 'MANAGEMENT_REVIEW_CONCLUSION_REQUIRED'; end if;
 select count(*) into required_count from public.management_review_inputs where review_id=review.id and input_kind in ('SERVICE_PERFORMANCE','CUSTOMER_FEEDBACK','AUDITS_AND_NC','RISKS_OPPORTUNITIES','SUPPLIERS','OBJECTIVES_AND_RESOURCES','PREVIOUS_ACTIONS');
 if required_count < 7 then raise exception 'MANAGEMENT_REVIEW_REQUIRED_INPUTS_MISSING'; end if;
 update public.management_reviews set status='COMPLETED',conclusion=trim(target_conclusion),completed_at=clock_timestamp(),completed_by=auth.uid() where id=review.id;
 insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source) values(review.organization_id,auth.uid(),'MANAGEMENT_REVIEW_COMPLETED','management_review',review.id,jsonb_build_object('status','COMPLETED','required_inputs',required_count),'WEB');
end; $$;
revoke all on function public.save_management_review_input(uuid,public.management_review_input_kind,text,text),public.complete_management_review(uuid,text) from public;
grant execute on function public.save_management_review_input(uuid,public.management_review_input_kind,text,text),public.complete_management_review(uuid,text) to authenticated;
