import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  ArchiveRestore,
  Landmark,
  Pencil,
  Plus,
  RefreshCw,
} from "lucide-react";
import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { fetchAccounts, updateAccount } from "./account-api";
import type { AccountStatus } from "./account-api";
import { AccountForm } from "./account-form";
import { openingBalanceText, type Account } from "./accounts";

const accountKinds = {
  business: "Business",
  personal: "Personal",
  deposit: "Fixed deposit",
};
const numberFormat = new Intl.NumberFormat("en-MY");
const dateFormat = new Intl.DateTimeFormat("en-MY", {
  dateStyle: "medium",
  timeZone: "Asia/Kuala_Lumpur",
});

function formatOpeningBalance(account: Account) {
  const [units, cents] = openingBalanceText(account.openingBalanceMinor).split(
    ".",
  );
  const negative = units.startsWith("-");
  const whole = numberFormat.format(BigInt(negative ? units.slice(1) : units));
  return `${account.currency} ${negative ? "−" : ""}${whole}.${cents}`;
}

export function Accounts() {
  const [params] = useSearchParams();
  const value = params.get("status");
  const status = value === "active" || value === "archived" ? value : "all";
  return <AccountsView key={status} status={status} />;
}

const views = {
  all: { label: "All", href: "/accounts", empty: "No accounts yet." },
  active: {
    label: "Active",
    href: "/accounts?status=active",
    empty: "No active accounts.",
  },
  archived: {
    label: "Archived",
    href: "/accounts?status=archived",
    empty: "No archived accounts.",
  },
} satisfies Record<
  AccountStatus,
  { label: string; href: string; empty: string }
>;

const actionIcons = { Edit: Pencil, Archive, Restore: ArchiveRestore };

function AccountAction({
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

function AccountsView({ status }: { status: AccountStatus }) {
  const client = useQueryClient();
  const [editor, setEditor] = useState<Account | "new" | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [saved, setSaved] = useState("");
  const query = useQuery({
    queryKey: ["accounts", status],
    queryFn: ({ signal }) => fetchAccounts(status, signal),
  });
  const changeStatus = useMutation({
    mutationFn: ({ id, archive }: { id: string; archive: boolean }) =>
      updateAccount(id, { archived: archive }),
    onSuccess: (account) => {
      setConfirming(null);
      setSaved(
        `${account.name} ${account.archivedAt ? "archived" : "restored"}.`,
      );
      return client.invalidateQueries({ queryKey: ["accounts"] });
    },
  });

  function openEditor(account: Account | "new") {
    setConfirming(null);
    setSaved("");
    changeStatus.reset();
    setEditor(account);
  }

  function setArchived(id: string, archive: boolean) {
    setSaved("");
    changeStatus.mutate({ id, archive });
  }

  return (
    <main>
      <div className="page-title">
        <div>
          <h1>Accounts</h1>
          <p>Opening balances by account and currency.</p>
        </div>
        <div className="page-actions">
          <button
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          >
            <RefreshCw aria-hidden="true" size={16} />
            {query.isFetching ? "Refreshing…" : "Refresh"}
          </button>
          {status !== "archived" && !editor && (
            <button
              className="primary-button"
              disabled={changeStatus.isPending}
              onClick={() => openEditor("new")}
            >
              <Plus aria-hidden="true" size={16} /> Add account
            </button>
          )}
        </div>
      </div>
      <nav className="account-views" aria-label="Account status">
        {Object.values(views).map((view) => (
          <Link
            key={view.href}
            to={view.href}
            aria-current={views[status] === view ? "page" : undefined}
          >
            {view.label}
          </Link>
        ))}
      </nav>
      {editor && (
        <AccountForm
          key={editor === "new" ? "new" : editor.id}
          account={editor === "new" ? undefined : editor}
          onCancel={() => setEditor(null)}
          onSaved={(account) => {
            setSaved(
              `${account.name} ${editor === "new" ? "added" : "updated"}.`,
            );
            setEditor(null);
            void client.invalidateQueries({ queryKey: ["accounts"] });
          }}
        />
      )}
      {saved && (
        <p className="save-status" role="status">
          {saved}
        </p>
      )}
      {query.isPending && <p role="status">Loading accounts…</p>}
      {query.isError && <p role="alert">{query.error.message}</p>}
      {changeStatus.isError && <p role="alert">{changeStatus.error.message}</p>}
      {query.data?.length === 0 && <p>{views[status].empty}</p>}
      {!!query.data?.length && (
        <ul
          className="accounts account-grid"
          aria-label={`${views[status].label} accounts`}
        >
          {query.data.map((account) => (
            <li key={account.id}>
              <div className="account-heading">
                <div className="account-icon">
                  <Landmark aria-hidden="true" size={20} />
                </div>
                <div className="account-card-labels">
                  <span>{accountKinds[account.kind]}</span>
                  {status === "all" && account.archivedAt && (
                    <span className="account-archived-label">Archived</span>
                  )}
                </div>
              </div>
              <h2>{account.name}</h2>
              <p className="balance">{formatOpeningBalance(account)}</p>
              <p className="date">
                As of{" "}
                <time dateTime={account.openingBalanceDate}>
                  {dateFormat.format(new Date(account.openingBalanceDate))}
                </time>
              </p>
              <div className="account-card-actions">
                {confirming === account.id ? (
                  <div role="group" aria-label={`Archive ${account.name}?`}>
                    <p>
                      Archive this account? You can restore it from the Archived
                      view.
                    </p>
                    <div className="page-actions">
                      <button
                        className="primary-button"
                        disabled={changeStatus.isPending}
                        onClick={() => setArchived(account.id, true)}
                      >
                        Confirm archive
                      </button>
                      <button
                        disabled={changeStatus.isPending}
                        onClick={() => {
                          setConfirming(null);
                          changeStatus.reset();
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="page-actions">
                    {account.archivedAt ? (
                      <AccountAction
                        action="Restore"
                        name={account.name}
                        disabled={
                          !!editor || !!confirming || changeStatus.isPending
                        }
                        onClick={() => setArchived(account.id, false)}
                      />
                    ) : (
                      <>
                        <AccountAction
                          action="Edit"
                          name={account.name}
                          disabled={
                            !!editor || !!confirming || changeStatus.isPending
                          }
                          onClick={() => openEditor(account)}
                        />
                        <AccountAction
                          action="Archive"
                          name={account.name}
                          disabled={
                            !!editor || !!confirming || changeStatus.isPending
                          }
                          onClick={() => {
                            setSaved("");
                            setConfirming(account.id);
                          }}
                        />
                      </>
                    )}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
