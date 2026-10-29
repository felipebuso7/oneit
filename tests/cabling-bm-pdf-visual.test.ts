import { mkdirSync, writeFileSync } from "node:fs";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({
  auth: { getUser: async () => ({ data: { user: { id: "user" } } }) },
  from: (table: string) => {
    const query = {
      select: () => query, eq: () => query, in: () => query, order: () => query, limit: () => query,
      maybeSingle: async () => table === "fiscal_batches"
        ? { data: { id: "batch", organization_id: "org", batch_number: "BM-FISCAL-TESTE", competence: "2026-10", total_amount: 375, measurement_sheet_ids: ["sheet"], status: "DRAFT" }, error: null }
        : { data: { role: "FINANCE" }, error: null },
      then: (resolve: (value: unknown) => unknown) => resolve({ data: [{ ticket_number: "FSM-2026-000005", lpu_code: "VISITA-3H", description: "Visita técnica até 3 horas", quantity: 3, unit_price: 125, total_price: 375, line_kind: "LPU", source_reference: "RTO-TESTE", service_date: "2026-10-28", service_location: "Polo Atibaia", order_reference: "OS-2026-000006" }], error: null }),
    };
    return query;
  },
}) }));

import { GET } from "@/app/api/field-service/fiscal/batch/[id]/cabling-pdf/route";

describe("prévia visual do BM fiscal", () => {
  it("gera capa e detalhamento com dados sintéticos", async () => {
    const response = await GET(new Request("https://oneit.example/api/field-service/fiscal/batch/test/cabling-pdf"), { params: Promise.resolve({ id: "d567b2e9-dc46-406d-8236-cbb98e82540a" }) });
    expect(response.status).toBe(200);
    const bytes = Buffer.from(await response.arrayBuffer());
    expect(bytes.subarray(0, 4).toString()).toBe("%PDF");
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(2);
    if (process.env.ONEIT_PDF_PREVIEW === "1") {
      mkdirSync("artifacts", { recursive: true });
      writeFileSync("artifacts/bm-fiscal-preview.pdf", bytes);
    }
  });
});
