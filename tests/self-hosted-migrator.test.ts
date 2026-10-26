import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrator = readFileSync("scripts/migrate-self-hosted.mjs", "utf8");

describe("self-hosted migration runner", () => {
  it("requires an owner connection and validates the auth compatibility contract", () => {
    expect(migrator).toContain("ONEIT_MIGRATION_DATABASE_URL is required");
    expect(migrator).toContain("to_regprocedure('auth.uid()')");
    expect(migrator).toContain("Self-hosted auth compatibility is missing");
  });

  it("records immutable migration checksums and applies each new migration atomically", () => {
    expect(migrator).toContain("oneit_system.schema_migrations");
    expect(migrator).toContain("Migration checksum changed after application");
    expect(migrator).toContain('await client.query("begin")');
    expect(migrator).toContain('await client.query("rollback")');
  });

  it("grants the runtime role only the privileges required by the application", () => {
    expect(migrator).toContain("grant select, insert, update, delete on all tables");
    expect(migrator).toContain("grant execute on all functions");
    expect(migrator).not.toContain("grant superuser");
  });
});
