import { describe, expect, it } from "vitest";
import { createSelfHostedSession, getSelfHostedOidcConfiguration, identityFromOidcClaims, readSelfHostedSession } from "./self-hosted-oidc";

describe("self-hosted OIDC adapter", () => {
  it("derives the Keycloak JWKS endpoint from the configured issuer", () => {
    expect(
      getSelfHostedOidcConfiguration({
        ONEIT_AUTH_ISSUER: "https://id.oneit.example/realms/oneit/",
        ONEIT_AUTH_CLIENT_ID: "oneit-web",
      }).jwksUri,
    ).toBe("https://id.oneit.example/realms/oneit/protocol/openid-connect/certs");
  });

  it("requires a verified subject and email claim before identity synchronization", () => {
    expect(
      identityFromOidcClaims({
        sub: "c12f0bd5-0a77-4b02-a4d6-003c218f15d4",
        email: "TECHNICIAN@ONEIT.EXAMPLE",
        name: "Técnico OneIT",
      }),
    ).toEqual({
      subject: "c12f0bd5-0a77-4b02-a4d6-003c218f15d4",
      email: "technician@oneit.example",
      fullName: "Técnico OneIT",
    });
    expect(() => identityFromOidcClaims({ sub: "only-subject" })).toThrow();
  });

  it("uses an expiring signed session without storing OIDC tokens in the browser", async () => {
    const environment = {
      ONEIT_APP_URL: "https://oneit.example",
      ONEIT_SESSION_SECRET: "12345678901234567890123456789012",
    };
    const token = await createSelfHostedSession(
      { id: "user-1", subject: "subject-1", email: "user@oneit.example", fullName: "Usuário OneIT" },
      environment,
    );
    await expect(readSelfHostedSession(token, environment)).resolves.toEqual({
      id: "user-1",
      email: "user@oneit.example",
      fullName: "Usuário OneIT",
    });
  });
});
