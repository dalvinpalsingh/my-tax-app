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
  options = recordStatusSchema.options,
}: {
  path: string;
  status: RecordStatus | "voided";
  label: string;
  options?: readonly (RecordStatus | "voided")[];
}) {
  return (
    <nav className="account-views" aria-label={label}>
      {options.map((value) => (
        <Link
          key={value}
          to={value === "all" ? path : `${path}?status=${value}`}
          aria-current={status === value ? "page" : undefined}
        >
          {value === "voided" ? "Voided" : statusLabels[value]}
        </Link>
      ))}
    </nav>
  );
}
