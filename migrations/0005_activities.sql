CREATE TABLE activities (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 120),
  start_date TEXT NOT NULL,
  business_id TEXT REFERENCES businesses (id) ON DELETE RESTRICT,
  archived_at TEXT
) STRICT;

CREATE INDEX activities_business_id ON activities (business_id);
