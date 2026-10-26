import { z } from "zod";
const audience=z.enum(["INTERNAL","EXTERNAL","BOTH"]);
export const knowledgeCategorySchema=z.object({organizationId:z.uuid(),name:z.string().trim().min(2).max(100),audience});
export const knowledgeArticleSchema=z.object({organizationId:z.uuid(),categoryId:z.uuid(),title:z.string().trim().min(5).max(240),slug:z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),summary:z.string().trim().min(10).max(1000),content:z.string().trim().min(10).max(50000),audience,changeReason:z.string().trim().min(5).max(1000)});
export const knowledgeArticleIdSchema=z.object({articleId:z.uuid()});
export const knowledgeArticleVersionSchema=z.object({articleId:z.uuid(),content:z.string().trim().min(10).max(50000),changeReason:z.string().trim().min(5).max(1000)});
