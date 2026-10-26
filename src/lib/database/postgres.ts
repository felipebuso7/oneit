import { Pool, type PoolClient, type QueryResultRow } from "pg";

type GlobalWithPool = typeof globalThis & {
  oneitPostgresPool?: Pool;
};

function databaseUrl(): string {
  const value = process.env.ONEIT_DATABASE_URL;
  if (!value) {
    throw new Error("ONEIT_DATABASE_URL is required for the self-hosted database adapter.");
  }

  const url = new URL(value);
  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    throw new Error("ONEIT_DATABASE_URL must use the postgres or postgresql protocol.");
  }

  return value;
}

export function getPostgresPool(): Pool {
  const runtime = globalThis as GlobalWithPool;
  if (runtime.oneitPostgresPool) return runtime.oneitPostgresPool;

  const useTls = process.env.ONEIT_DATABASE_SSL === "true";
  const pool = new Pool({
    connectionString: databaseUrl(),
    max: Number(process.env.ONEIT_DATABASE_POOL_MAX ?? 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    ssl: useTls ? { rejectUnauthorized: true } : undefined,
  });

  if (process.env.NODE_ENV !== "production") {
    runtime.oneitPostgresPool = pool;
  }

  return pool;
}

export async function queryPostgres<Row extends QueryResultRow>(
  text: string,
  values: readonly unknown[] = [],
) {
  return getPostgresPool().query<Row>(text, [...values]);
}

export type DatabaseActor = {
  userId: string;
  role?: "authenticated" | "service_role";
};

export async function withPostgresActor<Result>(
  actor: DatabaseActor,
  operation: (client: PoolClient) => Promise<Result>,
): Promise<Result> {
  const client = await getPostgresPool().connect();
  try {
    await client.query("begin");
    await client.query("select set_config('oneit.user_id', $1, true)", [actor.userId]);
    await client.query("select set_config('oneit.role', $1, true)", [actor.role ?? "authenticated"]);
    const result = await operation(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function closePostgresPool() {
  const runtime = globalThis as GlobalWithPool;
  if (runtime.oneitPostgresPool) {
    await runtime.oneitPostgresPool.end();
    runtime.oneitPostgresPool = undefined;
  }
}
