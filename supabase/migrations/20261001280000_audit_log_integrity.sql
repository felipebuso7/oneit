alter table public.audit_logs
  add column if not exists outcome text not null default 'SUCCEEDED' check (outcome in ('SUCCEEDED', 'FAILED', 'DENIED')),
  add column if not exists reason text,
  add column if not exists event_hash text;

update public.audit_logs
set event_hash = encode(digest(concat_ws('|', id::text, organization_id::text, actor_id::text, action, entity_type, entity_id::text, coalesce(before_value::text, ''), coalesce(after_value::text, ''), source, correlation_id::text, created_at::text), 'sha256'), 'hex')
where event_hash is null;

alter table public.audit_logs alter column event_hash set not null;

create or replace function public.hash_audit_log_event()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.event_hash := encode(digest(concat_ws('|', new.id::text, new.organization_id::text, new.actor_id::text, new.action, new.entity_type, new.entity_id::text, coalesce(new.before_value::text, ''), coalesce(new.after_value::text, ''), new.source, new.correlation_id::text, new.created_at::text), 'sha256'), 'hex');
  return new;
end;
$$;

create or replace function public.prevent_audit_log_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'AUDIT_LOG_APPEND_ONLY';
end;
$$;

create trigger audit_logs_hash_before_insert
before insert on public.audit_logs
for each row execute function public.hash_audit_log_event();

create trigger audit_logs_prevent_mutation
before update or delete on public.audit_logs
for each row execute function public.prevent_audit_log_mutation();
