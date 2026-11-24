CREATE TABLE businesses (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 120),
  start_date TEXT NOT NULL,
  registration_reference TEXT CHECK (length(trim(registration_reference)) BETWEEN 1 AND 120)
) STRICT;
