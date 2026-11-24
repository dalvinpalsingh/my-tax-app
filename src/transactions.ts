import { z } from "zod";
import { accountCurrencies, amountTextSchema } from "./accounts";

export const transactionKinds = ["income", "expense"] as const;
export const transactionKindLabels = { income: "Income", expense: "Expense" };
export const transactionDescriptionLimit = 500;
export const transactionStatusSchema = z.enum(["all", "active", "voided"]);
export type TransactionStatus = z.infer<typeof transactionStatusSchema>;
const recordId = z
  .string()
  .regex(/^[a-zA-Z0-9_-]+$/)
  .max(120);
const fields = {
  accountId: recordId,
  activityId: recordId.nullish().transform((value) => value ?? null),
  kind: z.enum(transactionKinds),
  transactionDate: z.iso.date({ error: "Enter a valid transaction date." }),
  postingDate: z.iso
    .date({ error: "Enter a valid posting date." })
    .nullish()
    .transform((value) => value ?? null),
  description: z
    .string()
    .trim()
    .max(transactionDescriptionLimit)
    .nullish()
    .transform((value) => value || null),
};
const details = {
  ...fields,
  amount: amountTextSchema.refine(
    (amount) => amount > 0,
    "Enter an amount greater than zero.",
  ),
};
export const createTransactionSchema = z.strictObject({
  ...details,
  id: z.uuid(),
});
export const editTransactionSchema = z.strictObject(details);
export const patchTransactionSchema = z.union([
  editTransactionSchema,
  z.strictObject({ voided: z.boolean() }),
]);
export const transactionSchema = z.object({
  ...fields,
  id: z.string(),
  currency: z.enum(accountCurrencies),
  amountMinor: z.number().int().positive(),
  accountName: z.string(),
  activityName: z.string().nullable(),
  source: z.literal("manual"),
  voidedAt: z.iso.datetime().nullable(),
});
export const transactionsResponse = z.object({
  transactions: z.array(transactionSchema),
});
export type Transaction = z.infer<typeof transactionSchema>;
export type TransactionInput = z.input<typeof editTransactionSchema>;
