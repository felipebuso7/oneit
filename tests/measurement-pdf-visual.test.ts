import { mkdirSync, writeFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { PDFDocument } from "pdf-lib";

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({
  auth: { getUser: async () => ({ data: { user: { id: "user" } }, error: null }) },
  from: (table: string) => {
    const query = { select: () => query, eq: () => query, in: () => query, order: () => query, limit: () => query, maybeSingle: async () => table === "measurement_sheets"
      ? { data: { id: "sheet", organization_id: "org", sheet_number: "BM-2026-10-TESTE", total_orders: 1, total_amount: 125, billing_period_id: "period", billing_periods: { competence: "2026-10-01", status: "DRAFT" } }, error: null }
      : { data: { role: "FINANCE" }, error: null },
      then: (resolve: (value: unknown) => unknown) => resolve({ data: [{ ticket_number: "FSM-2026-000005", lpu_code: "VISITA-3H", description: "Visita técnica até 3 horas", quantity: 1, unit_price: 125, total_price: 125, line_kind: "LPU", service_date: "2026-10-28", service_location: "Polo Atibaia", order_reference: "OS-2026-000006" }], error: null }) };
    return query;
  },
}) }));
import { GET } from "@/app/api/field-service/measurement/[id]/pdf/route";

describe("prévia visual do BM", () => {
  it("gera o BM de teste com capa e detalhamento", async () => {
    const response = await GET(new Request("https://oneit.example/api/field-service/measurement/test/pdf"), { params: Promise.resolve({ id: "d567b2e9-dc46-406d-8236-cbb98e82540a" }) });
    expect(response.status).toBe(200);
    const bytes = Buffer.from(await response.arrayBuffer());
    expect(bytes.subarray(0, 4).toString()).toBe("%PDF");
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(2);
    if (process.env.ONEIT_PDF_PREVIEW === "1") {
      mkdirSync("artifacts", { recursive: true });
      writeFileSync("artifacts/bm-preview.pdf", bytes);
    }
  });
});
