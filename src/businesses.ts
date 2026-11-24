import { z } from "zod";

const businessDetails = z.object({
  name: z.string().trim().min(1, "Enter a business name.").max(120),
  startDate: z.iso.date({ error: "Enter a valid start date." }),
});

export const businessSchema = businessDetails.extend({
  id: z.string(),
  registrationReference: z.string().nullable(),
});

export const createBusinessSchema = businessDetails
  .extend({
    registrationReference: z
      .string()
      .trim()
      .max(120)
      .optional()
      .transform((reference) => reference || null),
  })
  .strict();

export const businessesResponse = z.object({
  businesses: z.array(businessSchema),
});
export type Business = z.infer<typeof businessSchema>;
export type CreateBusinessInput = z.input<typeof createBusinessSchema>;
