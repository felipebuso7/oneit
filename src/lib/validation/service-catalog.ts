import { z } from "zod";
const code = z.string().trim().toUpperCase().regex(/^[A-Z0-9][A-Z0-9_-]{1,79}$/);
const name = z.string().trim().min(2).max(200);
export const serviceCategorySchema = z.object({ organizationId: z.uuid(), code, name });
export const serviceSubcategorySchema = z.object({ categoryId: z.uuid(), code, name });
export const serviceOfferingSchema = z.object({ subcategoryId: z.uuid(), code, name });
export const updateServiceCatalogItemSchema = z.object({
  id: z.uuid(),
  kind: z.enum(["category", "subcategory", "offering"]),
  code,
  name,
  active: z.enum(["true", "false"]).transform((value) => value === "true"),
});
