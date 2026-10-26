import { Pool } from "pg";

const connectionString = process.env.ONEIT_MIGRATION_DATABASE_URL;
if (!connectionString) {
  console.error("ONEIT_MIGRATION_DATABASE_URL ausente; auditoria do banco não executada.");
  process.exitCode = 2;
} else {
  const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 10_000 });
  try {
    const { rows: roles } = await pool.query("select to_regrole('authenticated') is not null as authenticated_exists, to_regrole('service_role') is not null as service_role_exists");
    if (!roles[0]?.authenticated_exists) throw new Error("ROLE_AUTHENTICATED_NOT_FOUND");

    const { rows: privileges } = await pool.query(`
      select
        has_table_privilege('authenticated', 'public.billing_email_log', 'INSERT') as client_can_insert_email_log,
        has_table_privilege('authenticated', 'public.billing_email_log', 'UPDATE') as client_can_update_email_log,
        has_table_privilege('authenticated', 'public.fiscal_batches', 'UPDATE') as client_can_update_fiscal_batch,
        has_function_privilege('authenticated', 'public.complete_billing_email(uuid,text)', 'EXECUTE') as client_can_complete_email,
        has_function_privilege('authenticated', 'public.claim_billing_email(text)', 'EXECUTE') as client_can_claim_email,
        has_function_privilege('authenticated', 'public.fail_billing_email(uuid,text,integer)', 'EXECUTE') as client_can_fail_email,
        has_function_privilege('service_role', 'public.complete_billing_email(uuid,text)', 'EXECUTE') as worker_can_complete_email,
        has_function_privilege('service_role', 'public.claim_billing_email(text)', 'EXECUTE') as worker_can_claim_email,
        has_function_privilege('service_role', 'public.fail_billing_email(uuid,text,integer)', 'EXECUTE') as worker_can_fail_email
    `);
    const { rows: policies } = await pool.query(`
      select tablename, policyname, cmd, roles, qual, with_check
        from pg_policies
       where schemaname = 'public'
         and tablename in ('billing_email_log', 'fiscal_batches')
       order by tablename, policyname
    `);
    const { rows: rls } = await pool.query(`
      select relname as table_name, relrowsecurity as enabled, relforcerowsecurity as forced
        from pg_class
       where oid in ('public.billing_email_log'::regclass, 'public.fiscal_batches'::regclass)
       order by relname
    `);

    console.log(JSON.stringify({ role: roles[0], privileges: privileges[0], rls, policies }, null, 2));
    const rights = privileges[0];
    if (
      rights.client_can_update_email_log || rights.client_can_complete_email ||
      rights.client_can_claim_email || rights.client_can_fail_email ||
      !rights.worker_can_complete_email || !rights.worker_can_claim_email || !rights.worker_can_fail_email
    ) throw new Error("BILLING_EMAIL_PRIVILEGE_BOUNDARY_FAILED");
    console.log("Limite de privilégios do worker de e-mail aprovado. Revise separadamente a política de inserção e os grants do lote fiscal.");
  } catch (error) {
    console.error(`Auditoria do banco falhou: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
