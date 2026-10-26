-- A client may queue an email, but only the service-role worker may record
-- provider results or claim/retry messages. This preserves the existing
-- authenticated queue endpoint while preventing a forged SENT record.
drop policy if exists "finance managers create billing email log" on public.billing_email_log;
create policy "finance managers queue billing email" on public.billing_email_log
  for insert to authenticated
  with check (
    public.has_organization_role(
      organization_id,
      array['SUPER_ADMIN','ORG_ADMIN','MANAGER','FINANCE']::public.platform_role[]
    )
    and status = 'QUEUED'
    and provider = 'PENDING'
    and sent_at is null
    and provider_message_id is null
    and locked_at is null
    and attempt_count = 0
    and created_by = auth.uid()
  );

revoke update, delete on public.billing_email_log from public, anon, authenticated;

revoke all on function public.claim_billing_email(text) from public, anon, authenticated;
revoke all on function public.complete_billing_email(uuid, text) from public, anon, authenticated;
revoke all on function public.fail_billing_email(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.claim_billing_email(text) to service_role;
grant execute on function public.complete_billing_email(uuid, text) to service_role;
grant execute on function public.fail_billing_email(uuid, text, integer) to service_role;
