import { afterEach, describe, expect, it } from "vitest";
import { closePostgresPool, getPostgresPool } from "./postgres";

const originalUrl = process.env.ONEIT_DATABASE_URL;

afterEach(async () => {
  await closePostgresPool();
  if (originalUrl === undefined) delete process.env.ONEIT_DATABASE_URL;
  else process.env.ONEIT_DATABASE_URL = originalUrl;
});

describe("self-hosted PostgreSQL adapter", () => {
  it("rejects a missing database URL before opening a connection", () => {
    delete process.env.ONEIT_DATABASE_URL;
    expect(() => getPostgresPool()).toThrow("ONEIT_DATABASE_URL is required");
  });

  it("rejects a non-PostgreSQL URL before opening a connection", () => {
    process.env.ONEIT_DATABASE_URL = "https://database.example.test";
    expect(() => getPostgresPool()).toThrow("must use the postgres or postgresql protocol");
  });

  it("creates a pool from a PostgreSQL connection string", () => {
    process.env.ONEIT_DATABASE_URL = "postgresql://oneit:secret@localhost:5432/oneit";
    const pool = getPostgresPool();
    expect(pool.totalCount).toBe(0);
  });
});
