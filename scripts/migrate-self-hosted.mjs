import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import pg from "pg";

const migrationUrl = process.env.ONEIT_MIGRATION_DATABASE_URL;
const appRole = process.env.ONEIT_DB_APP_USER;

if (!migrationUrl) {
  throw new Error("ONEIT_MIGRATION_DATABASE_URL is required.");
}

if (!appRole || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(appRole)) {
  throw new Error("ONEIT_DB_APP_USER must be a valid PostgreSQL role name.");
}

const migrationDirectory = path.resolve("supabase/migrations");
const files = (await readdir(migrationDirectory))
  .filter((file) => file.endsWith(".sql"))
  .sort((left, right) => left.localeCompare(right));

const { Pool } = pg;
const pool = new Pool({ connectionString: migrationUrl, max: 1, connectionTimeoutMillis: 10_000 });
const client = await pool.connect();

try {
  const compatibility = await client.query(
    "select to_regprocedure('auth.uid()') as actor_context, to_regclass('auth.users') as users_table",
  );
  if (!compatibility.rows[0]?.actor_context || !compatibility.rows[0]?.users_table) {
    throw new Error("Self-hosted auth compatibility is missing. Start the foundation containers before migrations.");
  }

  await client.query("create schema if not exists oneit_system");
  await client.query("create table if not exists oneit_system.schema_migrations (filename text primary key, checksum text not null, applied_at timestamptz not null default clock_timestamp())");

  for (const filename of files) {
    const source = await readFile(path.join(migrationDirectory, filename), "utf8");
    const checksum = createHash("sha256").update(source).digest("hex");
    const previous = await client.query(
      "select checksum from oneit_system.schema_migrations where filename = $1",
      [filename],
    );

    if (previous.rowCount) {
      if (previous.rows[0].checksum !== checksum) {
        throw new Error("Migration checksum changed after application: " + filename);
      }
      continue;
    }

    await client.query("begin");
    try {
      await client.query(source);
      await client.query(
        "insert into oneit_system.schema_migrations(filename, checksum) values ($1, $2)",
        [filename, checksum],
      );
      await client.query("commit");
      console.log("Applied " + filename);
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  }

  const safeRole = '"' + appRole.replaceAll('"', '""') + '"';
  await client.query("grant usage on schema public to " + safeRole);
  await client.query("grant select, insert, update, delete on all tables in schema public to " + safeRole);
  await client.query("grant usage, select on all sequences in schema public to " + safeRole);
  await client.query("grant execute on all functions in schema public to " + safeRole);
  await client.query("alter default privileges in schema public grant select, insert, update, delete on tables to " + safeRole);
  await client.query("alter default privileges in schema public grant usage, select on sequences to " + safeRole);
  await client.query("alter default privileges in schema public grant execute on functions to " + safeRole);

  console.log("Self-hosted database is up to date (" + files.length + " migrations checked).");
} finally {
  client.release();
  await pool.end();
}
