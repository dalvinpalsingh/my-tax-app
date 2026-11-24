CREATE TABLE transactions (
  id TEXT PRIMARY KEY NOT NULL,
  creation_hash TEXT NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  activity_id TEXT REFERENCES activities(id) ON DELETE RESTRICT,
  currency TEXT NOT NULL CHECK (currency IN ('MYR', 'USD')),
  kind TEXT NOT NULL CHECK (kind IN ('income', 'expense')),
  amount_minor INTEGER NOT NULL CHECK (amount_minor BETWEEN 1 AND 9007199254740991),
  transaction_date TEXT NOT NULL,
  posting_date TEXT,
  description TEXT,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source = 'manual'),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  voided_at TEXT
) STRICT;

CREATE INDEX transactions_account_id ON transactions(account_id);
CREATE INDEX transactions_activity_id ON transactions(activity_id);

CREATE TABLE transaction_revisions (
  id INTEGER PRIMARY KEY,
  transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE RESTRICT,
  action TEXT NOT NULL CHECK (action IN ('edit', 'void', 'restore')),
  actor TEXT NOT NULL CHECK (actor = 'owner'),
  changed_at TEXT NOT NULL,
  previous_state TEXT NOT NULL CHECK (json_valid(previous_state))
) STRICT;

CREATE INDEX transaction_revisions_transaction_id ON transaction_revisions(transaction_id);
CREATE INDEX transaction_revisions_previous_account ON transaction_revisions(json_extract(previous_state, '$.accountId'));

CREATE TRIGGER transactions_record_revision
AFTER UPDATE ON transactions
BEGIN
  INSERT INTO transaction_revisions (transaction_id, action, actor, changed_at, previous_state)
  VALUES (OLD.id,
    CASE WHEN OLD.voided_at IS NULL AND NEW.voided_at IS NOT NULL THEN 'void'
         WHEN OLD.voided_at IS NOT NULL AND NEW.voided_at IS NULL THEN 'restore'
         ELSE 'edit' END,
    'owner', NEW.updated_at,
    json_object('accountId', OLD.account_id, 'activityId', OLD.activity_id,
      'currency', OLD.currency, 'kind', OLD.kind, 'amountMinor', OLD.amount_minor,
      'transactionDate', OLD.transaction_date, 'postingDate', OLD.posting_date,
      'description', OLD.description, 'voidedAt', OLD.voided_at, 'updatedAt', OLD.updated_at)
  );
END;

CREATE TRIGGER accounts_prevent_referenced_currency_change
BEFORE UPDATE OF currency ON accounts
WHEN NEW.currency <> OLD.currency AND (
  EXISTS (SELECT 1 FROM transactions WHERE account_id = OLD.id)
  OR EXISTS (SELECT 1 FROM transaction_revisions WHERE json_extract(previous_state, '$.accountId') = OLD.id)
)
BEGIN
  SELECT RAISE(ABORT, 'account_currency_in_use');
END;
