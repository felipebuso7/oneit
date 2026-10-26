-- Um envio confirmado é evidência de auditoria e não pode ser editado ou removido.
create or replace function public.prevent_sent_billing_email_log_change()
returns trigger language plpgsql set search_path = public as $$
begin
  if old.status = 'SENT' then raise exception 'billing_email_log_immutable'; end if;
  return coalesce(new, old);
end; $$;

drop trigger if exists billing_email_log_immutability on public.billing_email_log;
create trigger billing_email_log_immutability
before update or delete on public.billing_email_log
for each row execute function public.prevent_sent_billing_email_log_change();
