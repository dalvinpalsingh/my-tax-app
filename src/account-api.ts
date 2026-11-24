import { accountSchema, accountsResponse } from "./accounts";
import type { CreateAccountInput, PatchAccountInput } from "./accounts";
import { recordListCacheOptions } from "./record-list";

const accountsUrl = "/api/accounts";
export const accountsQueryKey = ["accounts"];
const signIn = "Sign in with your approved account to continue.";

export async function fetchAccounts(signal: AbortSignal) {
  const response = await fetch(`${accountsUrl}?status=all`, {
    signal,
    cache: "no-store",
  });
  if (response.status === 403) throw new Error(signIn);
  if (!response.ok) throw new Error("Accounts are temporarily unavailable.");
  return accountsResponse.parse(await response.json()).accounts;
}

export const accountsQueryOptions = {
  ...recordListCacheOptions,
  queryKey: accountsQueryKey,
  queryFn: ({ signal }: { signal: AbortSignal }) => fetchAccounts(signal),
};

async function writeAccount(
  url: string,
  method: "POST" | "PATCH",
  input: CreateAccountInput | PatchAccountInput,
) {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (response.status === 403) throw new Error(signIn);
  if (response.status === 400)
    throw new Error("Check the account details and try again.");
  if (response.status === 404)
    throw new Error("Account not found. Refresh the account list.");
  if (response.status === 409) {
    const body = await response.json().catch(() => null);
    throw new Error(
      body &&
        typeof body === "object" &&
        "error" in body &&
        typeof body.error === "string"
        ? body.error
        : "Could not update this account.",
    );
  }
  if (!response.ok)
    throw new Error(
      "Could not save the account. Check the list before trying again.",
    );
  return accountSchema.parse(await response.json());
}

export function createAccount(input: CreateAccountInput) {
  return writeAccount(accountsUrl, "POST", input);
}

export function updateAccount(id: string, input: PatchAccountInput) {
  return writeAccount(
    `${accountsUrl}/${encodeURIComponent(id)}`,
    "PATCH",
    input,
  );
}
