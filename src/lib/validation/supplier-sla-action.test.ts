import { describe, expect, it } from "vitest";
import { supplierSlaActionSchema } from "./supplier-sla-action";
const id="550e8400-e29b-41d4-a716-446655440000";
describe("supplier sla action",()=>it("requires a traceable corrective action",()=>{expect(supplierSlaActionSchema.safeParse({slaRecordId:id,supplierId:id,organizationId:id,actionDescription:"Escalonar falha para o gestor do fornecedor",dueDate:"2026-10-15"}).success).toBe(true);expect(supplierSlaActionSchema.safeParse({slaRecordId:id,supplierId:id,organizationId:id,actionDescription:"cur"}).success).toBe(false)}));
