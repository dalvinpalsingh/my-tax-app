import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { accountSchema, createAccountSchema } from "./accounts";
import type { Account, CreateAccountInput } from "./accounts";

async function saveAccount(input: CreateAccountInput) {
  const response = await fetch("/api/accounts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (response.status === 403)
    throw new Error("Sign in with your approved account to continue.");
  if (response.status === 400)
    throw new Error("Check the account details and try again.");
  if (response.status !== 201)
    throw new Error(
      "Could not save the account. Check the list before trying again.",
    );
  return accountSchema.parse(await response.json());
}

export function AccountForm({
  onSaved,
  onCancel,
}: {
  onSaved: (account: Account) => void;
  onCancel: () => void;
}) {
  const [validation, setValidation] = useState("");
  const save = useMutation({ mutationFn: saveAccount, onSuccess: onSaved });

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
    save.mutate({
      name,
      kind,
      currency,
      openingBalanceDate,
      openingBalance: String(values.openingBalance).trim(),
    });
  }

  return (
    <form
      className="account-form"
      aria-labelledby="new-account-heading"
      onSubmit={submit}
    >
      <h2 id="new-account-heading">Add account</h2>
      <fieldset disabled={save.isPending}>
        <div className="form-fields">
          <label>
            Account name
            <input name="name" type="text" required maxLength={120} />
          </label>
          <label>
            Account type
            <select name="kind" defaultValue="business">
              <option value="business">Business</option>
              <option value="personal">Personal</option>
              <option value="deposit">Fixed deposit</option>
            </select>
          </label>
          <label>
            Currency
            <select name="currency" defaultValue="MYR">
              <option value="MYR">MYR</option>
              <option value="USD">USD</option>
            </select>
          </label>
          <label>
            Opening balance
            <input
              name="openingBalance"
              type="text"
              inputMode="decimal"
              required
              maxLength={32}
            />
          </label>
          <label>
            Balance as of
            <input name="openingBalanceDate" type="date" required />
          </label>
        </div>
        {(validation || save.error) && (
          <p role="alert">{validation || save.error?.message}</p>
        )}
        <div className="page-actions">
          <button className="primary-button" type="submit">
            {save.isPending ? "Saving…" : "Save account"}
          </button>
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </fieldset>
    </form>
  );
}
