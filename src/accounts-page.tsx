import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Landmark, Plus } from "lucide-react";
import { useLayoutEffect, useState } from "react";
import { Navigate } from "react-router";
import {
  accountsQueryKey,
  accountsQueryOptions,
  updateAccount,
} from "./account-api";
import { AccountForm } from "./account-form";
import {
  accountKindLabels,
  openingBalanceText,
  type Account,
} from "./accounts";
import { dateFormat, displayLocale } from "./display";
import { PageHeader } from "./page-header";
import { ArchiveConfirmation, RecordAction } from "./record-action";
import { filterRecordsByStatus } from "./record-list";
import { RecordLoadingStatus, RecordRefreshButton } from "./record-results";
import {
  RecordStatusNav,
  statusLabels,
  useRecordStatus,
} from "./record-status-nav";
import type { RecordStatus } from "./record-status";

const numberFormat = new Intl.NumberFormat(displayLocale);

function formatOpeningBalance(account: Account) {
  const [units, cents] = openingBalanceText(account.openingBalanceMinor).split(
    ".",
  );
  const negative = units.startsWith("-");
  const whole = numberFormat.format(BigInt(negative ? units.slice(1) : units));
  return `${account.currency} ${negative ? "−" : ""}${whole}.${cents}`;
}

export function Accounts() {
  const { data: status } = useRecordStatus();
  if (!status) return <Navigate to="/accounts" replace />;
  return <AccountsView status={status} />;
}

const emptyMessage = {
  all: "No accounts yet.",
  active: "No active accounts.",
  archived: "No archived accounts.",
} satisfies Record<RecordStatus, string>;

function AccountsView({ status }: { status: RecordStatus }) {
  const client = useQueryClient();
  const [editor, setEditor] = useState<Account | "new" | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [saved, setSaved] = useState("");
  const query = useQuery(accountsQueryOptions);
  const visibleAccounts = filterRecordsByStatus(query.data, status);
  const { mutate, reset, isPending, error } = useMutation({
    mutationFn: ({ id, archive }: { id: string; archive: boolean }) =>
      updateAccount(id, { archived: archive }),
    onSuccess: () => client.invalidateQueries({ queryKey: accountsQueryKey }),
  });

  useLayoutEffect(() => {
    setEditor(null);
    setConfirming(null);
    setSaved("");
    reset();
  }, [status, reset]);

  function openEditor(account: Account | "new") {
    setConfirming(null);
    setSaved("");
    reset();
    setEditor(account);
  }

  function setArchived(id: string, archive: boolean) {
    setSaved("");
    mutate(
      { id, archive },
      {
        onSuccess: (account) => {
          setConfirming(null);
          setSaved(
            `${account.name} ${account.archivedAt ? "archived" : "restored"}.`,
          );
        },
      },
    );
  }

  const actionsDisabled = !!editor || !!confirming || isPending;

  return (
    <main>
      <PageHeader
        title="Accounts"
        description="Opening balances by account and currency."
        actions={
          <>
            <RecordRefreshButton
              onRefresh={() => void query.refetch({ cancelRefetch: false })}
            />
            <button
              className="primary-button record-add-button"
              data-reserve-space={status === "archived" || !!editor}
              disabled={isPending}
              onClick={() => openEditor("new")}
            >
              <Plus aria-hidden="true" size={16} /> Add account
            </button>
          </>
        }
      />
      <RecordStatusNav
        path="/accounts"
        status={status}
        label="Account status"
      />
      <section aria-label="Account results">
        <RecordLoadingStatus
          records="accounts"
          isFetching={query.isFetching}
          isPending={query.isPending}
        />
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
            }}
          />
        )}
        {saved && (
          <p className="save-status" role="status">
            {saved}
          </p>
        )}
        {query.isError && <p role="alert">{query.error.message}</p>}
        {error && <p role="alert">{error.message}</p>}
        {visibleAccounts?.length === 0 && <p>{emptyMessage[status]}</p>}
        {!!visibleAccounts?.length && (
          <ul
            className="record-grid"
            aria-label={`${statusLabels[status]} accounts`}
          >
            {visibleAccounts.map((account) => (
              <li key={account.id}>
                <div className="account-heading">
                  <div className="account-icon">
                    <Landmark aria-hidden="true" size={20} />
                  </div>
                  <div className="account-card-labels">
                    <span>{accountKindLabels[account.kind]}</span>
                    <span
                      className="account-archived-label"
                      data-reserve-space={
                        status !== "all" || !account.archivedAt
                      }
                    >
                      {statusLabels.archived}
                    </span>
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
                    <ArchiveConfirmation
                      name={account.name}
                      record="account"
                      pending={isPending}
                      onConfirm={() => setArchived(account.id, true)}
                      onCancel={() => {
                        setConfirming(null);
                        reset();
                      }}
                    />
                  ) : (
                    <div className="page-actions">
                      {account.archivedAt ? (
                        <RecordAction
                          action="Restore"
                          name={account.name}
                          disabled={actionsDisabled}
                          onClick={() => setArchived(account.id, false)}
                        />
                      ) : (
                        <>
                          <RecordAction
                            action="Edit"
                            name={account.name}
                            disabled={actionsDisabled}
                            onClick={() => openEditor(account)}
                          />
                          <RecordAction
                            action="Archive"
                            name={account.name}
                            disabled={actionsDisabled}
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
      </section>
    </main>
  );
}
