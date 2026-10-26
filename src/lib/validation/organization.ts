import { z } from "zod";

const optionalExternalCode = z.string().trim().min(1).max(100).optional();

export const organizationSchema = z.object({
  legalName: z.string().trim().min(2).max(200),
  displayName: z.string().trim().min(2).max(120),
});

export const customerSchema = z.object({
  organizationId: z.uuid(),
  name: z.string().trim().min(2).max(200),
  externalCode: optionalExternalCode,
});

export const contractSchema = z
  .object({
    organizationId: z.uuid(),
    customerId: z.uuid(),
    code: z.string().trim().min(2).max(80),
    name: z.string().trim().min(2).max(200),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date().optional(),
    customerOwnerName: z.string().trim().max(200).optional(), serviceHours: z.string().trim().max(500).optional(),
    scopeSummary: z.string().trim().max(4000).optional(), exclusionsSummary: z.string().trim().max(4000).optional(),
    renewalAutomatic: z.boolean(), renewalNoticeDays: z.coerce.number().int().min(1).max(730).optional(),
  })
  .refine(({ startsAt, endsAt }) => !endsAt || endsAt >= startsAt, {
    message: "A vigência final não pode ser anterior à inicial.",
    path: ["endsAt"],
  });

export const regionSchema = z.object({
  organizationId: z.uuid(),
  name: z.string().trim().min(2).max(120),
  stateCode: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/).optional(),
});

export const technicianSchema = z.object({
  organizationId: z.uuid(),
  fullName: z.string().trim().min(3).max(200),
  email: z.email().optional(),
  phone: z.string().trim().min(8).max(30).optional(),
  employmentType: z.string().trim().min(2).max(80),
  baseCity: z.string().trim().min(2).max(120).optional(),
  primaryRegionId: z.uuid().optional(),
});

export const locationSchema = z.object({
  organizationId: z.uuid(),
  customerId: z.uuid(),
  name: z.string().trim().min(2).max(200),
  city: z.string().trim().min(2).max(120),
  stateCode: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/).optional(),
  externalCode: optionalExternalCode,
  street: z.string().trim().max(200).optional(),
  streetNumber: z.string().trim().max(40).optional(),
});

export const locationContactSchema = z.object({
  locationId: z.uuid(),
  name: z.string().trim().min(3).max(200),
  contactType: z.string().trim().min(2).max(80),
  email: z.email().optional(),
  phone: z.string().trim().min(8).max(30).optional(),
});
