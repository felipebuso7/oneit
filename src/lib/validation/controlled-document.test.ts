import { describe, expect, it } from "vitest";
import { controlledDocumentSchema, controlledDocumentVersionSchema } from "./controlled-document";
const id = "019cda50-f764-7a5e-9101-513020ce22e8";
describe("controlled document", () => it("requires controlled content and a change summary", () => { const value = { organizationId: id, title: "Procedimento de gestão de mudanças", category: "Procedimento", content: "O processo deve registrar avaliação, aprovação e implantação.", changeSummary: "Criação inicial do procedimento controlado." }; expect(controlledDocumentSchema.safeParse(value).success).toBe(true); expect(controlledDocumentVersionSchema.safeParse({ documentId: id, content: value.content, changeSummary: "curta" }).success).toBe(false); }));
