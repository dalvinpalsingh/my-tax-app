import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import {
  accountCurrencies,
  accountKindLabels,
  accountKinds,
  createAccountSchema,
  defaultAccountCurrency,
  defaultAccountKind,
  openingBalanceText,
} from "./accounts";
import type { Account, CreateAccountInput } from "./accounts";
import { accountsQueryKey, createAccount, updateAccount } from "./account-api";
import { transactionsQueryKey } from "./transaction-api";
import {
  openingBalanceMaxLength,
  recordNameMaxLength,
} from "./validation-limits";

export function AccountForm({
  account,
  onSaved,
  onCancel,
}: {
  account?: Account;
  onSaved: (account: Account) => void;
  onCancel: () => void;
}) {
  const client = useQueryClient();
  const [validation, setValidation] = useState("");
  const save = useMutation({
    mutationFn: (input: CreateAccountInput) =>
      account ? updateAccount(account.id, input) : createAccount(input),
    onSuccess: (saved) => {
      void client.invalidateQueries({ queryKey: accountsQueryKey });
      if (account && account.name !== saved.name) {
        void client.invalidateQueries({ queryKey: transactionsQueryKey });
      }
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (save.isPending) return;
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const result = createAccountSchema.safeParse(values);
    if (!result.success) {
      setValidation(result.error.issues[0].message);
      return;
    }
    setValidation("");
    const { name, kind, currency, openingBalanceDate } = result.data;
    save.mutate(
      {
        name,
        kind,
        currency,
        openingBalanceDate,
        openingBalance: String(values.openingBalance).trim(),
      },
      { onSuccess: onSaved },
    );
  }

  return (
    <form
      className="account-form"
      aria-labelledby="account-form-heading"
      onSubmit={submit}
    >
      <h2 id="account-form-heading">
        {account ? "Edit account" : "Add account"}
      </h2>
      <fieldset disabled={save.isPending}>
        <div className="form-fields">
          <label>
            Account name
            <input
              name="name"
              type="text"
              required
              maxLength={recordNameMaxLength}
              defaultValue={account?.name}
            />
          </label>
          <label>
            Account type
            <select
              name="kind"
              defaultValue={account?.kind ?? defaultAccountKind}
            >
              {accountKinds.map((kind) => (
                <option key={kind} value={kind}>
                  {accountKindLabels[kind]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Currency
            <select
              name="currency"
              defaultValue={account?.currency ?? defaultAccountCurrency}
            >
              {accountCurrencies.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
          </label>
          <label>
            Opening balance
            <input
              name="openingBalance"
              type="text"
              inputMode="decimal"
              required
              maxLength={openingBalanceMaxLength}
              defaultValue={
                account
                  ? openingBalanceText(account.openingBalanceMinor)
                  : undefined
              }
            />
          </label>
          <label>
            Balance as of
            <input
              name="openingBalanceDate"
              type="date"
              required
              defaultValue={account?.openingBalanceDate}
            />
          </label>
        </div>
        {(validation || save.error) && (
          <p role="alert">{validation || save.error?.message}</p>
        )}
        <div className="page-actions">
          <button className="primary-button" type="submit">
            {save.isPending
              ? "Saving…"
              : account
                ? "Save changes"
                : "Save account"}
          </button>
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </fieldset>
    </form>
  );
}
