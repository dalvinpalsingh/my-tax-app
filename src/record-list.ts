import type { RecordStatus } from "./record-status";

export const recordListCacheOptions = {
  staleTime: Infinity,
  gcTime: Infinity,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
};

export function filterRecordsByStatus<T extends { archivedAt: string | null }>(
  records: T[] | undefined,
  status: RecordStatus,
) {
  if (status === "all") return records;
  return records?.filter(
    (record) => (record.archivedAt !== null) === (status === "archived"),
  );
}
