import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownUp, Plus } from "lucide-react";
import { useLayoutEffect, useState, type FormEvent } from "react";
import { Navigate, useSearchParams } from "react-router";
import { accountsQueryOptions } from "./account-api";
import { openingBalanceText } from "./accounts";
import { activitiesQueryKey, fetchActivities } from "./activity-api";
import { dateFormat } from "./display";
import { PageHeader } from "./page-header";
import { RecordAction } from "./record-action";
import { recordListCacheOptions } from "./record-list";
import { RecordLoadingStatus, RecordRefreshButton } from "./record-results";
import { RecordStatusNav } from "./record-status-nav";
import {
  transactionsQueryKey,
  transactionsQueryOptions,
  writeTransaction,
} from "./transaction-api";
import {
  editTransactionSchema,
  transactionDescriptionLimit,
  transactionKinds,
  transactionKindLabels,
  transactionStatusSchema,
  type Transaction,
  type TransactionInput,
  type TransactionStatus,
} from "./transactions";
import { openingBalanceMaxLength } from "./validation-limits";

const path = "/transactions";

function TransactionForm({
  transaction,
  onCancel,
  onSaved,
}: {
  transaction?: Transaction;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const client = useQueryClient();
  const [id] = useState(() => crypto.randomUUID());
  const [accountId, setAccountId] = useState(transaction?.accountId ?? "");
  const [validation, setValidation] = useState("");
  const accounts = useQuery(accountsQueryOptions);
  const activities = useQuery({
    ...recordListCacheOptions,
    queryKey: activitiesQueryKey,
    queryFn: ({ signal }) => fetchActivities(signal),
  });
  const selectedAccount = accounts.data?.find(
    (account) => account.id === accountId,
  );
  const currency =
    selectedAccount?.currency ??
    (transaction && accountId === transaction.accountId
      ? transaction.currency
      : undefined);
  const save = useMutation({
    mutationFn: (input: TransactionInput) =>
      transaction
        ? writeTransaction(input, transaction.id)
        : writeTransaction({ ...input, id }),
    onSuccess: () =>
      void client.invalidateQueries({ queryKey: transactionsQueryKey }),
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (save.isPending) return;
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    const input = {
      ...fields,
      postingDate: fields.postingDate || null,
      activityId: fields.activityId || null,
    };
    const result = editTransactionSchema.safeParse(input);
    if (!result.success) {
      setValidation(result.error.issues[0].message);
      return;
    }
    setValidation("");
    save.mutate(
      { ...result.data, amount: String(fields.amount) },
      { onSuccess: onSaved },
    );
  }

  return (
    <form
      className="account-form"
      aria-labelledby="transaction-form-heading"
      onSubmit={submit}
    >
      <h2 id="transaction-form-heading">
        {transaction ? "Edit transaction" : "Add transaction"}
      </h2>
      <fieldset
        disabled={save.isPending || accounts.isPending || activities.isPending}
      >
        <div className="form-fields">
          <label>
            Account
            <select
              name="accountId"
              required
              value={accountId}
              onChange={(event) => setAccountId(event.currentTarget.value)}
            >
              <option value="">Select an account</option>
              {transaction &&
                !accounts.data?.some(
                  (account) => account.id === transaction.accountId,
                ) && (
                  <option value={transaction.accountId}>
                    {transaction.accountName} (current)
                  </option>
                )}
              {accounts.data
                ?.filter(
                  (account) =>
                    !account.archivedAt ||
                    account.id === transaction?.accountId,
                )
                .map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({account.currency})
                    {account.archivedAt && " (archived)"}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Type
            <select name="kind" defaultValue={transaction?.kind ?? "income"}>
              {transactionKinds.map((kind) => (
                <option key={kind} value={kind}>
                  {transactionKindLabels[kind]}
                </option>
              ))}
            </select>
          </label>
          <label>
            {currency ? `Amount (${currency})` : "Amount"}
            <input
              name="amount"
              inputMode="decimal"
              required
              maxLength={openingBalanceMaxLength}
              defaultValue={
                transaction
                  ? openingBalanceText(transaction.amountMinor)
                  : undefined
              }
            />
          </label>
          <label>
            Transaction date
            <input
              type="date"
              name="transactionDate"
              required
              defaultValue={transaction?.transactionDate}
            />
          </label>
          <label>
            Bank posting date (optional)
            <input
              type="date"
              name="postingDate"
              defaultValue={transaction?.postingDate ?? undefined}
            />
          </label>
          <label>
            Activity (optional)
            <select
              name="activityId"
              defaultValue={transaction?.activityId ?? ""}
            >
              <option value="">No activity</option>
              {transaction?.activityId &&
                !activities.data?.some(
                  (activity) => activity.id === transaction.activityId,
                ) && (
                  <option value={transaction.activityId}>
                    {transaction.activityName} (current)
                  </option>
                )}
              {activities.data
                ?.filter(
                  (activity) =>
                    !activity.archivedAt ||
                    activity.id === transaction?.activityId,
                )
                .map((activity) => (
                  <option key={activity.id} value={activity.id}>
                    {activity.name}
                    {activity.archivedAt && " (archived)"}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Description (optional)
            <input
              name="description"
              maxLength={transactionDescriptionLimit}
              defaultValue={transaction?.description ?? undefined}
            />
          </label>
        </div>
        {(validation || save.error) && (
          <p role="alert">{validation || save.error?.message}</p>
        )}
        <div className="page-actions">
          <button className="primary-button" type="submit">
            {save.isPending ? "Saving…" : "Save transaction"}
          </button>
        </div>
      </fieldset>
      {(accounts.isError || activities.isError) && (
        <p role="alert">
          Could not load all account and activity choices.{" "}
          <button
            type="button"
            onClick={() => {
              if (accounts.isError) void accounts.refetch();
              if (activities.isError) void activities.refetch();
            }}
          >
            Retry
          </button>
        </p>
      )}
      <button type="button" disabled={save.isPending} onClick={onCancel}>
        Cancel
      </button>
    </form>
  );
}

export function Transactions() {
  const [params] = useSearchParams();
  const status = transactionStatusSchema.safeParse(
    params.get("status") ?? "all",
  );
  if (!status.success) return <Navigate to={path} replace />;
  return <TransactionsView status={status.data} />;
}

function TransactionsView({ status }: { status: TransactionStatus }) {
  const client = useQueryClient();
  const query = useQuery(transactionsQueryOptions);
  const [editor, setEditor] = useState<Transaction | "new" | null>(null);
  const [confirming, setConfirming] = useState<Transaction | null>(null);
  const [saved, setSaved] = useState("");
  const { mutate, isPending, error, reset } = useMutation({
    mutationFn: (row: Transaction) =>
      writeTransaction({ voided: !row.voidedAt }, row.id),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: transactionsQueryKey }),
  });

  useLayoutEffect(() => {
    setEditor(null);
    setConfirming(null);
    setSaved("");
    reset();
  }, [status, reset]);

  const visible =
    status === "all"
      ? query.data
      : query.data?.filter(
          (row) => Boolean(row.voidedAt) === (status === "voided"),
        );
  const busy = !!editor || !!confirming || isPending;
  const confirmationAction = confirming?.voidedAt ? "Restore" : "Void";
  const openEditor = (row: Transaction | "new") => {
    setSaved("");
    reset();
    setEditor(row);
  };
  return (
    <main>
      <PageHeader
        title="Transactions"
        description="Record income and expenses by account."
        actions={
          <>
            <RecordRefreshButton
              onRefresh={() => void query.refetch({ cancelRefetch: false })}
            />
            <button
              className="primary-button record-add-button"
              type="button"
              disabled={busy}
              data-reserve-space={status === "voided" || !!editor}
              onClick={() => openEditor("new")}
            >
              <Plus size={16} aria-hidden="true" /> Add transaction
            </button>
          </>
        }
      />
      <RecordStatusNav
        path={path}
        status={status}
        label="Transaction status"
        options={transactionStatusSchema.options}
      />
      <section aria-label="Transaction results">
        <RecordLoadingStatus
          records="transactions"
          isFetching={query.isFetching}
          isPending={query.isPending}
        />
        {editor && (
          <TransactionForm
            key={editor === "new" ? "new" : editor.id}
            transaction={editor === "new" ? undefined : editor}
            onCancel={() => setEditor(null)}
            onSaved={() => {
              setEditor(null);
              setSaved("Transaction saved.");
            }}
          />
        )}
        {saved && <p role="status">{saved}</p>}
        {query.error && <p role="alert">{query.error.message}</p>}
        {error && <p role="alert">{error.message}</p>}
        {visible?.length === 0 && (
          <p>
            {status === "all"
              ? "No transactions yet."
              : `No ${status} transactions.`}
          </p>
        )}
        {!!visible?.length && (
          <ul className="record-grid" aria-label="Transactions">
            {visible.map((row) => {
              const kind = transactionKindLabels[row.kind];
              const name = `${kind} on ${row.transactionDate} for ${row.accountName}`;
              const action = row.voidedAt ? "Restore" : "Void";
              return (
                <li key={row.id}>
                  <div className="account-heading">
                    <span className="account-icon">
                      <ArrowDownUp size={20} aria-hidden="true" />
                    </span>
                    {row.voidedAt && (
                      <span className="account-archived-label">Voided</span>
                    )}
                  </div>
                  <h2>{row.description || kind}</h2>
                  <p className="balance">
                    {row.currency} {row.kind === "expense" ? "−" : ""}
                    {openingBalanceText(row.amountMinor)}
                  </p>
                  <div className="date record-card-detail wrap-anywhere">
                    <p>
                      {row.accountName} ·{" "}
                      {dateFormat.format(new Date(row.transactionDate))}
                    </p>
                    {row.postingDate && (
                      <p>
                        Posted {dateFormat.format(new Date(row.postingDate))}
                      </p>
                    )}
                    {row.activityName && <p>Activity: {row.activityName}</p>}
                  </div>
                  <div className="account-card-actions">
                    {confirming?.id === row.id ? (
                      <div
                        role="group"
                        aria-label={`${confirmationAction} ${name}?`}
                      >
                        <p>{confirmationAction} this transaction?</p>
                        <div className="page-actions">
                          <button
                            type="button"
                            className="primary-button"
                            disabled={isPending}
                            onClick={() =>
                              mutate(row, {
                                onSuccess: () => {
                                  setConfirming(null);
                                  setSaved(
                                    row.voidedAt
                                      ? "Transaction restored."
                                      : "Transaction voided.",
                                  );
                                },
                              })
                            }
                          >
                            Confirm {confirmationAction.toLowerCase()}
                          </button>
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => {
                              setConfirming(null);
                              reset();
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="page-actions">
                        {!row.voidedAt && (
                          <RecordAction
                            action="Edit"
                            name={name}
                            disabled={busy}
                            onClick={() => openEditor(row)}
                          />
                        )}
                        <RecordAction
                          action={action}
                          name={name}
                          disabled={busy}
                          onClick={() => {
                            reset();
                            setSaved("");
                            setConfirming(row);
                          }}
                        />
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
