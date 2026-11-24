import { recordListCacheOptions } from "./record-list";
import {
  transactionSchema,
  transactionsResponse,
  type TransactionInput,
} from "./transactions";

const url = "/api/transactions";
export const transactionsQueryKey = ["transactions"];

export const transactionsQueryOptions = {
  ...recordListCacheOptions,
  queryKey: transactionsQueryKey,
  queryFn: async ({ signal }: { signal: AbortSignal }) => {
    const response = await fetch(`${url}?status=all`, {
      signal,
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Could not load transactions.");
    return transactionsResponse.parse(await response.json()).transactions;
  },
};

export async function writeTransaction(
  input:
    | TransactionInput
    | (TransactionInput & { id: string })
    | { voided: boolean },
  id?: string,
) {
  const response = await fetch(id ? `${url}/${encodeURIComponent(id)}` : url, {
    method: id ? "PATCH" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(
      body &&
        typeof body === "object" &&
        "error" in body &&
        typeof body.error === "string"
        ? body.error
        : "Could not save the transaction.",
    );
  }
  return transactionSchema.parse(await response.json());
}
