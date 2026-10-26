import { describe, expect, it } from "vitest";
import { decodeImageDataUrl } from "@/lib/demo/report-pdf";

describe("decodificador de evidências do RTO", () => {
  it("converte PNG e JPEG base64 em bytes", () => {
    const png = decodeImageDataUrl("data:image/png;base64,AAE=");
    const jpg = decodeImageDataUrl("data:image/jpeg;base64,AAI=");
    expect(png?.type).toBe("png");
    expect([... (png?.bytes ?? [])]).toEqual([0, 1]);
    expect(jpg?.type).toBe("jpg");
    expect([... (jpg?.bytes ?? [])]).toEqual([0, 2]);
  });

  it("rejeita formatos que não sejam imagem base64", () => {
    expect(decodeImageDataUrl("https://example.test/photo.jpg")).toBeNull();
    expect(decodeImageDataUrl("data:image/png;base64,inválido")).toBeNull();
  });
});
