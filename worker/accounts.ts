import {
  accountSchema,
  accountsResponse,
  createAccountSchema,
  patchAccountSchema,
} from "../src/accounts";
import type { Account } from "../src/accounts";

const accountColumns = `id, name, currency, kind,
  opening_balance_minor AS openingBalanceMinor,
  opening_balance_date AS openingBalanceDate, archived_at AS archivedAt`;

export async function listAccounts(db: D1Database, archived: boolean | null) {
  const filter = archived === null ? null : Number(archived);
  const { results } = await db
    .prepare(
      `SELECT ${accountColumns} FROM accounts
       WHERE ? IS NULL OR (archived_at IS NOT NULL) = ? ORDER BY name, id`,
    )
    .bind(filter, filter)
    .all<Account>();
  return accountsResponse.parse({ accounts: results });
}

export async function createAccount(db: D1Database, body: unknown) {
  const result = createAccountSchema.safeParse(body);
  if (!result.success) return null;
  const account: Account = {
    id: crypto.randomUUID(),
    ...result.data,
    archivedAt: null,
  };
  await db
    .prepare(
      `INSERT INTO accounts (id, name, currency, kind, opening_balance_minor, opening_balance_date)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      account.id,
      account.name,
      account.currency,
      account.kind,
      account.openingBalanceMinor,
      account.openingBalanceDate,
    )
    .run();
  return account;
}

export async function updateAccount(db: D1Database, id: string, body: unknown) {
  const result = patchAccountSchema.safeParse(body);
  if (!result.success)
    return { status: 400, error: "Enter valid account details." };

  const details = result.data;
  if ("archived" in details) {
    const statement = details.archived ? "COALESCE(archived_at, ?)" : "NULL";
    const values = details.archived ? [new Date().toISOString(), id] : [id];
    const account = await db
      .prepare(
        `UPDATE accounts SET archived_at = ${statement}
                WHERE id = ? RETURNING ${accountColumns}`,
      )
      .bind(...values)
      .first<Account>();
    return account
      ? { status: 200, account: accountSchema.parse(account) }
      : { status: 404, error: "Account not found." };
  }

  const account = await db
    .prepare(
      `UPDATE accounts SET name = COALESCE(?, name), currency = COALESCE(?, currency),
         kind = COALESCE(?, kind), opening_balance_minor = COALESCE(?, opening_balance_minor),
         opening_balance_date = COALESCE(?, opening_balance_date)
       WHERE id = ? AND archived_at IS NULL RETURNING ${accountColumns}`,
    )
    .bind(
      details.name ?? null,
      details.currency ?? null,
      details.kind ?? null,
      details.openingBalanceMinor ?? null,
      details.openingBalanceDate ?? null,
      id,
    )
    .first<Account>();
  if (account) return { status: 200, account: accountSchema.parse(account) };

  const exists = await db
    .prepare("SELECT id FROM accounts WHERE id = ?")
    .bind(id)
    .first();
  return exists
    ? { status: 409, error: "Restore this account before editing it." }
    : { status: 404, error: "Account not found." };
}
