import { z } from "zod";

export const accountSchema = z.object({
  id: z.string(),
  name: z.string(),
  currency: z.enum(["MYR", "USD"]),
  kind: z.enum(["business", "personal", "deposit"]),
  openingBalanceMinor: z.number().int(),
  openingBalanceDate: z.iso.date(),
});

export const accountsResponse = z.object({ accounts: z.array(accountSchema) });
export type Account = z.infer<typeof accountSchema>;
