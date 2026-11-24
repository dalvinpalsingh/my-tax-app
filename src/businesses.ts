import { z } from "zod";
import { archiveChangeSchema, archivedAtSchema } from "./record-status";
import {
  recordNameMaxLength,
  registrationReferenceMaxLength,
} from "./validation-limits";

const businessDetails = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter a business name.")
    .max(recordNameMaxLength),
  startDate: z.iso.date({ error: "Enter a valid start date." }),
});
const registrationReferenceSchema = z
  .string()
  .trim()
  .max(registrationReferenceMaxLength);

export const businessSchema = businessDetails.extend({
  id: z.string(),
  registrationReference: z.string().nullable(),
  archivedAt: archivedAtSchema,
});

export const createBusinessSchema = businessDetails
  .extend({
    registrationReference: registrationReferenceSchema
      .optional()
      .transform((reference) => reference || null),
  })
  .strict();

export const patchBusinessSchema = z.union([
  archiveChangeSchema,
  businessDetails
    .extend({ registrationReference: registrationReferenceSchema.nullable() })
    .partial()
    .strict()
    .refine((fields) => Object.keys(fields).length > 0),
]);

export const businessesResponse = z.object({
  businesses: z.array(businessSchema),
});
export type Business = z.infer<typeof businessSchema>;
export type BusinessDetails = z.output<typeof createBusinessSchema>;
export type CreateBusinessInput = z.input<typeof createBusinessSchema>;
export type PatchBusinessInput = z.input<typeof patchBusinessSchema>;
