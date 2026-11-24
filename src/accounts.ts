import { z } from "zod";
import { archiveChangeSchema, archivedAtSchema } from "./record-status";
import {
  openingBalanceMaxLength,
  recordNameMaxLength,
} from "./validation-limits";

export const accountCurrencies = ["MYR", "USD"] as const;
export const accountKinds = ["business", "personal", "deposit"] as const;
export const accountKindLabels = {
  business: "Business",
  personal: "Personal",
  deposit: "Fixed deposit",
} satisfies Record<(typeof accountKinds)[number], string>;
export const defaultAccountCurrency =
  "MYR" satisfies (typeof accountCurrencies)[number];
export const defaultAccountKind =
  "business" satisfies (typeof accountKinds)[number];

// Every currently supported currency uses two decimal places.
const minorUnitDigits = 2;
const minorUnitsPerMajor = 10n ** BigInt(minorUnitDigits);
const openingBalancePattern = new RegExp(
  `^-?[0-9]+(?:\\.[0-9]{1,${minorUnitDigits}})?$`,
);

export const amountTextSchema = z
  .string()
  .trim()
  .max(openingBalanceMaxLength)
  .regex(
    openingBalancePattern,
    "Enter a balance with up to two decimal places.",
  )
  .transform((amount, ctx) => {
    const negative = amount.startsWith("-");
    const [units, cents = ""] = (negative ? amount.slice(1) : amount).split(
      ".",
    );
    const minor =
      BigInt(units) * minorUnitsPerMajor +
      BigInt(cents.padEnd(minorUnitDigits, "0"));
    if (minor > BigInt(Number.MAX_SAFE_INTEGER)) {
      ctx.addIssue({
        code: "custom",
        message: "Enter a smaller amount.",
      });
      return z.NEVER;
    }
    return Number(negative ? -minor : minor);
  });

export const accountSchema = z.object({
  id: z.string(),
  name: z.string(),
  currency: z.enum(accountCurrencies),
  kind: z.enum(accountKinds),
  openingBalanceMinor: z.number().int(),
  openingBalanceDate: z.iso.date(),
  archivedAt: archivedAtSchema,
});

export const accountsResponse = z.object({ accounts: z.array(accountSchema) });
export type Account = z.infer<typeof accountSchema>;

const accountFields = accountSchema
  .omit({ id: true, openingBalanceMinor: true, archivedAt: true })
  .extend({
    name: z
      .string()
      .trim()
      .min(1, "Enter an account name.")
      .max(recordNameMaxLength),
    openingBalance: amountTextSchema,
  })
  .strict();

export const createAccountSchema = accountFields.transform(
  ({ openingBalance, ...details }) => ({
    ...details,
    openingBalanceMinor: openingBalance,
  }),
);

export const patchAccountSchema = z.union([
  archiveChangeSchema,
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
  const cents = String(absolute % minorUnitsPerMajor).padStart(
    minorUnitDigits,
    "0",
  );
  return `${amount < 0n ? "-" : ""}${absolute / minorUnitsPerMajor}.${cents}`;
}
