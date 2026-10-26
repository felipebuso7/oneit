-- Document register for evidence stored in Drive or managed storage, with controlled lifecycle.
create or replace function public.create_sgsti_document_register_entry(
  target_organization_id uuid,target_parent_id uuid,target_kind text,target_code text,target_title text,target_drive_url text default null,target_storage_key text default null,target_next_review_at date default null
) returns uuid language plpgsql security definer set search_path=public as $$
declare parent_record public.sgsti_documents%rowtype; document_id uuid;
begin
 if not public.has_sgsti_management_access(target_organization_id) then raise exception 'SGSTI_DOCUMENT_NOT_AUTHORIZED'; end if;
 if target_kind not in ('FOLDER','DOCUMENT') or coalesce(length(trim(target_title)),0) not between 3 and 240 then raise exception 'SGSTI_DOCUMENT_INVALID_INPUT'; end if;
 if target_parent_id is not null then select * into parent_record from public.sgsti_documents where id=target_parent_id; if parent_record.id is null or parent_record.organization_id<>target_organization_id or parent_record.document_kind<>'FOLDER' then raise exception 'SGSTI_DOCUMENT_PARENT_INVALID'; end if; end if;
 if target_kind='DOCUMENT' and coalesce(nullif(trim(target_drive_url),''),nullif(trim(target_storage_key),'')) is null then raise exception 'SGSTI_DOCUMENT_SOURCE_REQUIRED'; end if;
 if target_drive_url is not null and nullif(trim(target_drive_url),'') is not null and trim(target_drive_url) !~ '^https://[^[:space:]]+$' then raise exception 'SGSTI_DOCUMENT_URL_INVALID'; end if;
 insert into public.sgsti_documents(organization_id,parent_id,document_kind,code,title,drive_url,storage_key,next_review_at,owner_id)
 values(target_organization_id,target_parent_id,target_kind,nullif(trim(target_code),''),trim(target_title),nullif(trim(target_drive_url),''),nullif(trim(target_storage_key),''),target_next_review_at,auth.uid()) returning id into document_id;
 insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source) values(target_organization_id,auth.uid(),'SGSTI_DOCUMENT_REGISTER_ENTRY_CREATED','sgsti_document',document_id,jsonb_build_object('kind',target_kind,'parent_id',target_parent_id),'WEB');
 return document_id;
end; $$;

create or replace function public.submit_sgsti_document_register_review(target_document_id uuid) returns void language plpgsql security definer set search_path=public as $$
declare document_record public.sgsti_documents%rowtype;
begin
 select * into document_record from public.sgsti_documents where id=target_document_id for update;
 if document_record.id is null or document_record.document_kind<>'DOCUMENT' or not public.has_sgsti_management_access(document_record.organization_id) then raise exception 'SGSTI_DOCUMENT_REVIEW_NOT_AUTHORIZED'; end if;
 if document_record.status not in ('DRAFT','EFFECTIVE') then raise exception 'SGSTI_DOCUMENT_REVIEW_INVALID_STATE'; end if;
 update public.sgsti_documents set status='PENDING_APPROVAL' where id=document_record.id;
 insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source) values(document_record.organization_id,auth.uid(),'SGSTI_DOCUMENT_SUBMITTED','sgsti_document',document_record.id,jsonb_build_object('status','PENDING_APPROVAL'),'WEB');
end; $$;

create or replace function public.approve_sgsti_document_register_entry(target_document_id uuid,target_next_review_at date default null) returns void language plpgsql security definer set search_path=public as $$
declare document_record public.sgsti_documents%rowtype;
begin
 select * into document_record from public.sgsti_documents where id=target_document_id for update;
 if document_record.id is null or document_record.document_kind<>'DOCUMENT' or not public.has_sgsti_approval_access(document_record.organization_id) then raise exception 'SGSTI_DOCUMENT_APPROVAL_NOT_AUTHORIZED'; end if;
 if document_record.status<>'PENDING_APPROVAL' then raise exception 'SGSTI_DOCUMENT_APPROVAL_INVALID_STATE'; end if;
 if document_record.owner_id=auth.uid() then raise exception 'SGSTI_DOCUMENT_SELF_APPROVAL_FORBIDDEN'; end if;
 update public.sgsti_documents set status='EFFECTIVE',last_reviewed_at=current_date,last_approved_at=current_date,next_review_at=coalesce(target_next_review_at,next_review_at) where id=document_record.id;
 insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source) values(document_record.organization_id,auth.uid(),'SGSTI_DOCUMENT_APPROVED','sgsti_document',document_record.id,jsonb_build_object('status','EFFECTIVE'),'WEB');
end; $$;

create or replace function public.obsolete_sgsti_document_register_entry(target_document_id uuid,target_reason text) returns void language plpgsql security definer set search_path=public as $$
declare document_record public.sgsti_documents%rowtype;
begin
 select * into document_record from public.sgsti_documents where id=target_document_id for update;
 if document_record.id is null or document_record.document_kind<>'DOCUMENT' or not public.has_organization_role(document_record.organization_id,array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[]) then raise exception 'SGSTI_DOCUMENT_OBSOLESCENCE_NOT_AUTHORIZED'; end if;
 if document_record.status='OBSOLETE' or coalesce(length(trim(target_reason)),0)<10 then raise exception 'SGSTI_DOCUMENT_OBSOLESCENCE_INVALID'; end if;
 update public.sgsti_documents set status='OBSOLETE',obsolete_at=clock_timestamp(),obsolete_reason=trim(target_reason) where id=document_record.id;
 insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source) values(document_record.organization_id,auth.uid(),'SGSTI_DOCUMENT_OBSOLETED','sgsti_document',document_record.id,jsonb_build_object('reason',trim(target_reason)),'WEB');
end; $$;

revoke all on function public.create_sgsti_document_register_entry(uuid,uuid,text,text,text,text,text,date),public.submit_sgsti_document_register_review(uuid),public.approve_sgsti_document_register_entry(uuid,date),public.obsolete_sgsti_document_register_entry(uuid,text) from public;
grant execute on function public.create_sgsti_document_register_entry(uuid,uuid,text,text,text,text,text,date),public.submit_sgsti_document_register_review(uuid),public.approve_sgsti_document_register_entry(uuid,date),public.obsolete_sgsti_document_register_entry(uuid,text) to authenticated;
