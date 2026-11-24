import { z } from "zod";

export const recordStatusSchema = z.enum(["all", "active", "archived"]);
export type RecordStatus = z.infer<typeof recordStatusSchema>;

export const archiveChangeSchema = z.strictObject({ archived: z.boolean() });
export const archivedAtSchema = z.iso.datetime().nullable();

export function archivedFilter(status: RecordStatus) {
  return status === "all" ? null : Number(status === "archived");
}
