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
        has_table_privilege('authenticated', 'public.fiscal_batches', 'INSERT') as client_can_insert_fiscal_batch,
        has_table_privilege('service_role', 'public.fiscal_batches', 'UPDATE') as worker_can_update_fiscal_batch,
        has_function_privilege('authenticated', 'public.create_fiscal_batch(uuid,date,uuid)', 'EXECUTE') as client_can_create_fiscal_batch,
        has_function_privilege('authenticated', 'public.close_fiscal_batch(uuid,uuid)', 'EXECUTE') as client_can_close_fiscal_batch,
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
    const { rows: fiscalFunctions } = await pool.query(`
      select proname, prosecdef
        from pg_proc
       where oid in (
         'public.create_fiscal_batch(uuid,date,uuid)'::regprocedure,
         'public.close_fiscal_batch(uuid,uuid)'::regprocedure
       )
    `);
    const { rows: fiscalTriggers } = await pool.query(`
      select tgname, tgenabled
        from pg_trigger
       where tgrelid = 'public.billing_email_log'::regclass
         and tgname = 'fiscal_batch_email_acceptance'
    `);

    console.log(JSON.stringify({ role: roles[0], privileges: privileges[0], rls, policies, fiscalFunctions, fiscalTriggers }, null, 2));
    const rights = privileges[0];
    if (
      rights.client_can_update_email_log || rights.client_can_complete_email ||
      rights.client_can_claim_email || rights.client_can_fail_email ||
      !rights.worker_can_complete_email || !rights.worker_can_claim_email || !rights.worker_can_fail_email
    ) throw new Error("BILLING_EMAIL_PRIVILEGE_BOUNDARY_FAILED");
    if (
      rights.client_can_update_fiscal_batch || rights.client_can_insert_fiscal_batch ||
      !rights.worker_can_update_fiscal_batch ||
      !rights.client_can_create_fiscal_batch || !rights.client_can_close_fiscal_batch
    ) throw new Error("FISCAL_BATCH_PRIVILEGE_BOUNDARY_FAILED");
    if (fiscalFunctions.length !== 2 || fiscalFunctions.some((item) => !item.prosecdef) ||
      fiscalTriggers.length !== 1 || fiscalTriggers[0].tgenabled !== "O") {
      throw new Error("FISCAL_BATCH_TRANSITION_BOUNDARY_FAILED");
    }
    // Exercise the trigger only on a local disposable database. Never write
    // fixtures to a cloud database, even though this transaction rolls back.
    const databaseHost = new URL(connectionString).hostname;
    if (["localhost", "127.0.0.1", "::1"].includes(databaseHost)) {
      const client = await pool.connect();
      try {
      await client.query("begin");
      const { rows: organizations } = await client.query(`
        insert into public.organizations(legal_name, display_name)
        values ('CI Fiscal Test', 'CI Fiscal Test') returning id
      `);
      const organizationId = organizations[0].id;
      const { rows: batches } = await client.query(`
        insert into public.fiscal_batches(organization_id, competence, batch_number, status)
        values ($1::uuid, date_trunc('month', now())::date, 'CI-FISCAL-TEST', 'READY') returning id
      `, [organizationId]);
      const batchId = batches[0].id;
      const { rows: logs } = await client.query(`
        insert into public.billing_email_log(organization_id, fiscal_batch_id, email_type, subject)
        values ($1, $2, 'FISCAL', 'CI fiscal acceptance') returning id
      `, [organizationId, batchId]);
      await client.query("set local role service_role");
      await client.query(`
        update public.billing_email_log
           set status = 'SENT', sent_at = now(), provider_message_id = 'ci-provider-id'
         where id = $1
      `, [logs[0].id]);
      await client.query("reset role");
      const { rows: afterAcceptance } = await client.query(
        "select status, sent_at from public.fiscal_batches where id = $1", [batchId]
      );
      if (afterAcceptance[0]?.status !== "SENT" || !afterAcceptance[0]?.sent_at) {
        throw new Error("FISCAL_BATCH_PROVIDER_ACCEPTANCE_NOT_APPLIED");
      }
      await client.query("savepoint before_immutable_update");
      let immutableRejected = false;
      try {
        await client.query("update public.fiscal_batches set total_amount = 1 where id = $1", [batchId]);
      } catch (error) {
        immutableRejected = error instanceof Error && error.message.includes("sent_fiscal_batch_immutable");
      }
      await client.query("rollback to savepoint before_immutable_update");
      if (!immutableRejected) throw new Error("SENT_FISCAL_BATCH_MUTATION_ALLOWED");
      } finally {
        await client.query("rollback").finally(() => client.release());
      }
    } else {
      console.log("Teste transacional ignorado: endereço de banco não local.");
    }
    console.log("Limites de privilégios do worker de e-mail e do lote fiscal aprovados. Testes operacionais com usuários ainda são necessários.");
  } catch (error) {
    console.error(`Auditoria do banco falhou: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
