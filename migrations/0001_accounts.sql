CREATE TABLE accounts (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  currency TEXT NOT NULL CHECK (currency IN ('MYR', 'USD')),
  kind TEXT NOT NULL CHECK (kind IN ('business', 'personal', 'deposit')),
  opening_balance_minor INTEGER NOT NULL
    CHECK (opening_balance_minor BETWEEN -9007199254740991 AND 9007199254740991),
  opening_balance_date TEXT NOT NULL
) STRICT;
