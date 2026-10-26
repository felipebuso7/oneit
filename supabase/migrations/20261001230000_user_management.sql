create policy "organization admins read member profiles" on public.user_profiles for select to authenticated using (
  exists (select 1 from public.user_roles target where target.user_id = user_profiles.id and public.has_organization_role(target.organization_id, array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[]))
);
