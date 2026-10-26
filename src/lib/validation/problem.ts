import { z } from "zod";
export const createProblemSchema=z.object({ticketId:z.uuid(),title:z.string().trim().min(5).max(240),description:z.string().trim().min(10).max(10000),priority:z.coerce.number().int().min(1).max(5)});
