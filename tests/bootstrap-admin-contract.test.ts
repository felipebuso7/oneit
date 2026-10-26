import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("contrato de bootstrap administrativo", () => {
  it("mantém a senha somente no ambiente seguro e exige política mínima", async () => {
    const source = await readFile("scripts/bootstrap-initial-admin.mjs", "utf8");

    expect(source).toContain("process.env.ONEIT_INITIAL_ADMIN_PASSWORD");
    expect(source).toContain("password.length < 12");
    expect(source).toContain("não passe a senha na linha de comando");
    expect(source).not.toMatch(/--password/);
  });

  it("não permite repetir o bootstrap para o mesmo perfil ou organização", async () => {
    const source = await readFile("scripts/bootstrap-initial-admin.mjs", "utf8");

    expect(source).toContain("já existe perfil para este e-mail");
    expect(source).toContain("já existe organização com esta razão social");
  });
});
