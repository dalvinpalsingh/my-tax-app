import { Archive, ArchiveRestore, CircleSlash, Pencil } from "lucide-react";

const actionIcons = {
  Edit: Pencil,
  Archive,
  Restore: ArchiveRestore,
  Void: CircleSlash,
};

export function RecordAction({
  action,
  name,
  disabled,
  onClick,
}: {
  action: keyof typeof actionIcons;
  name: string;
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = actionIcons[action];
  return (
    <button
      type="button"
      className="account-action"
      data-action={action.toLowerCase()}
      aria-label={`${action} ${name}`}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon aria-hidden="true" size={18} />
      <span className="account-action-tooltip" aria-hidden="true">
        {action}
      </span>
    </button>
  );
}

export function ArchiveConfirmation({
  name,
  record,
  pending,
  onConfirm,
  onCancel,
}: {
  name: string;
  record: string;
  pending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div role="group" aria-label={`Archive ${name}?`}>
      <p>Archive this {record}? You can restore it from the Archived view.</p>
      <div className="page-actions">
        <button
          type="button"
          className="primary-button"
          disabled={pending}
          onClick={onConfirm}
        >
          Confirm archive
        </button>
        <button type="button" disabled={pending} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
