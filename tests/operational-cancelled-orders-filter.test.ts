import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("filtros operacionais de OS canceladas", () => {
  it("não exibe OS canceladas nas filas de serviço, despacho e rotas", () => {
    const serviceOrders = readFileSync("src/app/(portal)/portal/service-orders/page.tsx", "utf8");
    const dispatch = readFileSync("src/app/(portal)/portal/field-service/page.tsx", "utf8");
    const routes = readFileSync("src/app/(portal)/portal/routes/page.tsx", "utf8");
    expect(serviceOrders).toContain('.neq("status", "CANCELLED")');
    expect(dispatch).toContain('.neq("status", "CANCELLED")');
    expect(dispatch).toContain('activeTicketIds.has(order.ticket_id)');
    expect(routes).toContain('.neq("status", "CANCELLED")');
  });
});
