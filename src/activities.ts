import { z } from "zod";
import { archiveChangeSchema, archivedAtSchema } from "./record-status";
import { recordNameMaxLength } from "./validation-limits";

const activityDetails = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter an activity name.")
    .max(recordNameMaxLength),
  startDate: z.iso.date({ error: "Enter a valid start date." }),
});
const businessId = z
  .string()
  .regex(/^[a-zA-Z0-9_-]+$/, "Select a business from the list.")
  .nullable();

export const activitySchema = activityDetails.extend({
  id: z.string(),
  archivedAt: archivedAtSchema,
  business: z
    .object({ id: z.string(), name: z.string(), archivedAt: archivedAtSchema })
    .nullable(),
});

export const createActivitySchema = activityDetails
  .extend({ businessId: businessId.optional() })
  .strict();
export const patchActivitySchema = z.union([
  archiveChangeSchema,
  createActivitySchema
    .partial()
    .refine((fields) => Object.keys(fields).length > 0),
]);
export const activitiesResponse = z.object({
  activities: z.array(activitySchema),
});
export type Activity = z.infer<typeof activitySchema>;
export type CreateActivityInput = z.input<typeof createActivitySchema>;
export type PatchActivityInput = z.input<typeof patchActivitySchema>;
