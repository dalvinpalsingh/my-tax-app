import { z } from "zod";

export const accountSchema = z.object({
  id: z.string(),
  name: z.string(),
  currency: z.enum(["MYR", "USD"]),
  kind: z.enum(["business", "personal", "deposit"]),
  openingBalanceMinor: z.number().int(),
  openingBalanceDate: z.iso.date(),
  archivedAt: z.iso.datetime().nullable(),
});

export const accountsResponse = z.object({ accounts: z.array(accountSchema) });
export type Account = z.infer<typeof accountSchema>;

const accountFields = accountSchema
  .omit({ id: true, openingBalanceMinor: true, archivedAt: true })
  .extend({
    name: z.string().trim().min(1, "Enter an account name.").max(120),
    openingBalance: z
      .string()
      .trim()
      .max(32)
      .regex(
        /^-?[0-9]+(?:\.[0-9]{1,2})?$/,
        "Enter a balance with up to two decimal places.",
      )
      .transform((amount, ctx) => {
        const negative = amount.startsWith("-");
        const [units, cents = ""] = (negative ? amount.slice(1) : amount).split(
          ".",
        );
        const minor = BigInt(units) * 100n + BigInt(cents.padEnd(2, "0"));
        if (minor > BigInt(Number.MAX_SAFE_INTEGER)) {
          ctx.addIssue({
            code: "custom",
            message: "Enter a smaller opening balance.",
          });
          return z.NEVER;
        }
        return Number(negative ? -minor : minor);
      }),
  })
  .strict();

export const createAccountSchema = accountFields.transform(
  ({ openingBalance, ...details }) => ({
    ...details,
    openingBalanceMinor: openingBalance,
  }),
);

export const patchAccountSchema = z.union([
  z.strictObject({ archived: z.boolean() }),
  accountFields
    .partial()
    .refine((fields) => Object.keys(fields).length > 0)
    .transform(({ openingBalance, ...details }) => ({
      ...details,
      openingBalanceMinor: openingBalance,
    })),
]);

export type CreateAccountInput = z.input<typeof createAccountSchema>;
export type PatchAccountInput = z.input<typeof patchAccountSchema>;

export function openingBalanceText(minorUnits: number) {
  const amount = BigInt(minorUnits);
  const absolute = amount < 0n ? -amount : amount;
  const cents = String(absolute % 100n).padStart(2, "0");
  return `${amount < 0n ? "-" : ""}${absolute / 100n}.${cents}`;
}
