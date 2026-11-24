import { queryOptions, type QueryClient } from "@tanstack/react-query";
import { businessesResponse } from "./businesses";
import { recordListCacheOptions } from "./record-list";

export const businessesQueryKey = ["businesses"];

async function fetchBusinesses() {
  const response = await fetch("/api/businesses?status=all", {
    cache: "no-store",
  });
  if (response.status === 403)
    throw new Error("Sign in with your approved account to continue.");
  if (!response.ok) throw new Error("Businesses are temporarily unavailable.");
  return businessesResponse.parse(await response.json()).businesses;
}

export const businessesQueryOptions = queryOptions({
  ...recordListCacheOptions,
  queryKey: businessesQueryKey,
  queryFn: fetchBusinesses,
});

export async function refreshBusinessChoices(client: QueryClient) {
  // Start a fresh read after the write, even if the picker was still loading.
  await client.cancelQueries({ queryKey: businessesQueryKey });
  await client.invalidateQueries({
    queryKey: businessesQueryKey,
    refetchType: "none",
  });
  // This request stays alive if the picker closes and loses its observer.
  await client.prefetchQuery(businessesQueryOptions);
}
