import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const runtimeRole = readFileSync("deploy/self-hosted/initdb/01-runtime-role.sh", "utf8");
const authCompatibility = readFileSync("deploy/self-hosted/initdb/02-auth-compat.sql", "utf8");
const oidcIdentity = readFileSync("deploy/self-hosted/initdb/03-oidc-identity.sql", "utf8");
const foundation = readFileSync("deploy/self-hosted/compose.foundation.yml", "utf8");

describe("self-hosted VPS foundation", () => {
  it("keeps database and storage on an internal-only Docker network", () => {
    expect(foundation).toContain("internal: true");
    expect(foundation).not.toContain("ports:");
    expect(foundation).toContain("postgres:16-alpine");
    expect(foundation).toContain("minio/minio:");
  });

  it("includes an internal OIDC provider backed by a separate database", () => {
    expect(foundation).toContain("quay.io/keycloak/keycloak:");
    expect(foundation).toContain("--proxy-headers=xforwarded");
    expect(runtimeRole).toContain("ONEIT_IDP_DB_USER");
    expect(runtimeRole).toContain("createdb");
  });

  it("creates a non-superuser runtime database account", () => {
    expect(runtimeRole).toContain("login nosuperuser nocreatedb nocreaterole noreplication");
    expect(runtimeRole).toContain("grant authenticated to");
    expect(runtimeRole).toContain("\\gexec");
  });

  it("provides an actor context contract compatible with domain migrations", () => {
    expect(authCompatibility).toContain("create table if not exists auth.users");
    expect(authCompatibility).toContain("create or replace function auth.uid()");
    expect(authCompatibility).toContain("current_setting('oneit.user_id', true)");
    expect(authCompatibility).toContain("create or replace function auth.role()");
  });

  it("only synchronizes validated OIDC identities through a controlled function", () => {
    expect(oidcIdentity).toContain("create or replace function auth.upsert_oidc_user");
    expect(oidcIdentity).toContain("OIDC_SUBJECT_AND_EMAIL_REQUIRED");
    expect(oidcIdentity).toContain("grant execute on function auth.upsert_oidc_user");
  });
});
