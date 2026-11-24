import {
  createTransactionSchema,
  patchTransactionSchema,
  transactionSchema,
  transactionsResponse,
  type TransactionStatus,
} from "../src/transactions";

const selection = `SELECT t.id, t.account_id AS accountId, t.activity_id AS activityId,
  t.currency, t.kind, t.amount_minor AS amountMinor, t.transaction_date AS transactionDate,
  t.posting_date AS postingDate, t.description, t.source, t.voided_at AS voidedAt,
  a.name AS accountName, v.name AS activityName
  FROM transactions t JOIN accounts a ON a.id = t.account_id
  LEFT JOIN activities v ON v.id = t.activity_id`;

async function getTransaction(db: D1Database, id: string) {
  const row = await db.prepare(`${selection} WHERE t.id = ?`).bind(id).first();
  return row && transactionSchema.parse(row);
}

export async function listTransactions(
  db: D1Database,
  status: TransactionStatus,
) {
  const filter = status === "all" ? null : Number(status === "voided");
  const { results } = await db
    .prepare(
      `${selection}
    WHERE ? IS NULL OR (t.voided_at IS NOT NULL) = ?
    ORDER BY t.transaction_date DESC, t.created_at DESC, t.id`,
    )
    .bind(filter, filter)
    .all();
  return transactionsResponse.parse({ transactions: results });
}

const invalid = { status: 400, error: "Enter valid transaction details." };
const unavailable = {
  status: 409,
  error: "Choose an active account and, if assigned, an active activity.",
};
const missing = { status: 404, error: "Transaction not found." };

export async function createTransaction(db: D1Database, body: unknown) {
  const parsed = createTransactionSchema.safeParse(body);
  if (!parsed.success) return invalid;
  const {
    id,
    accountId,
    activityId,
    kind,
    amount,
    transactionDate,
    postingDate,
    description,
  } = parsed.data;
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(
      JSON.stringify([
        accountId,
        activityId,
        kind,
        amount,
        transactionDate,
        postingDate,
        description,
      ]),
    ),
  );
  const hash = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  const now = new Date().toISOString();
  const inserted = await db
    .prepare(
      `INSERT INTO transactions (
    id, creation_hash, account_id, activity_id, currency, kind, amount_minor,
    transaction_date, posting_date, description, created_at, updated_at
  ) SELECT ?, ?, a.id, ?, a.currency, ?, ?, ?, ?, ?, ?, ?
    FROM accounts a WHERE a.id = ? AND a.archived_at IS NULL
      AND (? IS NULL OR EXISTS (SELECT 1 FROM activities WHERE id = ? AND archived_at IS NULL))
    ON CONFLICT(id) DO NOTHING RETURNING id`,
    )
    .bind(
      id,
      hash,
      activityId,
      kind,
      amount,
      transactionDate,
      postingDate,
      description,
      now,
      now,
      accountId,
      activityId,
      activityId,
    )
    .first();
  if (inserted)
    return { status: 201, transaction: await getTransaction(db, id) };

  const existing = await db
    .prepare("SELECT creation_hash AS hash FROM transactions WHERE id = ?")
    .bind(id)
    .first<{ hash: string }>();
  if (!existing) return unavailable;
  return existing.hash === hash
    ? { status: 200, transaction: await getTransaction(db, id) }
    : {
        status: 409,
        error:
          "This submission was already used for different transaction details.",
      };
}

export async function updateTransaction(
  db: D1Database,
  id: string,
  body: unknown,
) {
  const parsed = patchTransactionSchema.safeParse(body);
  if (!parsed.success) return invalid;
  const details = parsed.data;
  const now = new Date().toISOString();
  if ("voided" in details) {
    await db
      .prepare(
        `UPDATE transactions SET voided_at = ?, updated_at = ?
      WHERE id = ? AND (voided_at IS NOT NULL) <> ?`,
      )
      .bind(details.voided ? now : null, now, id, Number(details.voided))
      .run();
    const transaction = await getTransaction(db, id);
    return transaction ? { status: 200, transaction } : missing;
  }

  const {
    accountId,
    activityId,
    kind,
    amount,
    transactionDate,
    postingDate,
    description,
  } = details;
  const updated = await db
    .prepare(
      `UPDATE transactions AS t
    SET account_id = a.id, activity_id = ?, currency = a.currency, kind = ?,
      amount_minor = ?, transaction_date = ?, posting_date = ?, description = ?, updated_at = ?
    FROM accounts AS a
    WHERE t.id = ? AND t.voided_at IS NULL AND a.id = ?
      AND (a.archived_at IS NULL OR a.id = t.account_id)
      AND (? IS NULL OR ? = t.activity_id OR EXISTS (
        SELECT 1 FROM activities WHERE id = ? AND archived_at IS NULL
      )) RETURNING id`,
    )
    .bind(
      activityId,
      kind,
      amount,
      transactionDate,
      postingDate,
      description,
      now,
      id,
      accountId,
      activityId,
      activityId,
      activityId,
    )
    .first();
  if (updated)
    return { status: 200, transaction: await getTransaction(db, id) };
  const transaction = await getTransaction(db, id);
  if (!transaction) return missing;
  return transaction.voidedAt
    ? { status: 409, error: "Restore this transaction before editing it." }
    : unavailable;
}
