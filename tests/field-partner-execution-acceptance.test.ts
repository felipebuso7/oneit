import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("encerramento do atendimento externo", () => {
  it("exige evidência e aceite desenhado antes de registrar a execução", () => {
    const component = readFileSync("src/components/field-service/partner-execution.tsx", "utf8");
    expect(component).toContain("if (!signatureName.trim() || !signatureDataUrl)");
    expect(component).toContain("if (!evidence.length)");
    expect(component).toContain("canvas.current.toDataURL(\"image/png\")");
    expect(component).toContain("signatureDataUrl: signatureDataUrl || undefined");
  });

  it("mantém a foto fora do JSON do evento remoto", () => {
    const component = readFileSync("src/components/field-service/partner-execution.tsx", "utf8");
    expect(component).toContain("/api/field-service/partner/upload");
    expect(component).toContain("evidence,");
    expect(component).not.toContain("dataUrl: file");
  });
});
