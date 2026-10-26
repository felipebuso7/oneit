create policy "sgsti management reads assurance action plans"
on public.action_plans for select to authenticated
using(
  source_entity_type='SGSTI_ASSURANCE_REQUEST'
  and exists(
    select 1 from public.sgsti_assurance_requests request
    where request.id=source_entity_id
      and public.has_sgsti_management_access(request.organization_id)
  )
);
