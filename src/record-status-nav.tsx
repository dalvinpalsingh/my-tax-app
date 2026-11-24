import { Link, useSearchParams } from "react-router";
import { recordStatusSchema, type RecordStatus } from "./record-status";

export const statusLabels = {
  all: "All",
  active: "Active",
  archived: "Archived",
} satisfies Record<RecordStatus, string>;

export function useRecordStatus() {
  const [params] = useSearchParams();
  return recordStatusSchema.safeParse(params.get("status") ?? "all");
}

export function RecordStatusNav({
  path,
  status,
  label,
}: {
  path: string;
  status: RecordStatus;
  label: string;
}) {
  return (
    <nav className="account-views" aria-label={label}>
      {recordStatusSchema.options.map((value) => (
        <Link
          key={value}
          to={value === "all" ? path : `${path}?status=${value}`}
          aria-current={status === value ? "page" : undefined}
        >
          {statusLabels[value]}
        </Link>
      ))}
    </nav>
  );
}
