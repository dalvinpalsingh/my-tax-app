import { RefreshCw } from "lucide-react";

export function RecordRefreshButton({ onRefresh }: { onRefresh: () => void }) {
  return (
    <button type="button" onClick={onRefresh}>
      <RefreshCw aria-hidden="true" size={16} /> Refresh
    </button>
  );
}

export function RecordLoadingStatus({
  isFetching,
  isPending,
  records,
}: {
  isFetching: boolean;
  isPending: boolean;
  records: string;
}) {
  return (
    <p className="record-loading" role="status">
      {isFetching && `${isPending ? "Loading" : "Refreshing"} ${records}…`}
    </p>
  );
}
