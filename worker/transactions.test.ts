import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { handleApi } from "./api";

let sqlite: DatabaseSync;
let db: D1Database;
const id = "00000000-0000-4000-8000-000000000001";
const details = {
  accountId: "myr",
  kind: "income",
  amount: "1234.56",
  transactionDate: "2025-12-31",
};

function send(path: string, method = "GET", body?: unknown, authorized = true) {
  return handleApi(
    new Request(`https://app.example.invalid/api/${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    db,
    authorized,
  );
}

beforeEach(() => {
  sqlite = new DatabaseSync(":memory:");
  const migrations = new URL("../migrations/", import.meta.url);
  for (const file of readdirSync(migrations).sort()) {
    sqlite.exec(readFileSync(new URL(file, migrations), "utf8"));
  }
  sqlite.exec(`INSERT INTO accounts (id, name, currency, kind, opening_balance_minor, opening_balance_date)
    VALUES ('myr', 'Synthetic MYR', 'MYR', 'business', 0, '2026-01-01'),
           ('usd', 'Synthetic USD', 'USD', 'business', 0, '2026-01-01');
    INSERT INTO activities (id, name, start_date) VALUES ('work', 'Synthetic work', '2025-01-01');`);
  db = {
    prepare(sql: string) {
      const statement = sqlite.prepare(sql);
      return {
        bind(...values: SQLInputValue[]) {
          return {
            first: async () => statement.get(...values) ?? null,
            all: async () => ({ results: statement.all(...values) }),
            run: async () => statement.run(...values),
          };
        },
      };
    },
  } as unknown as D1Database;
});
afterEach(() => sqlite.close());

describe("manual transaction ledger", () => {
  it("stores earlier transactions exactly and makes creation retries idempotent", async () => {
    const input = { ...details, id };
    const created = await send("transactions", "POST", input);
    expect(created.status).toBe(201);
    expect(await created.json()).toMatchObject({
      id,
      amountMinor: 123456,
      currency: "MYR",
      activityId: null,
      postingDate: null,
      transactionDate: "2025-12-31",
      source: "manual",
    });
    expect((await send("transactions", "POST", input)).status).toBe(200);
    expect(
      (await send("transactions", "POST", { ...input, kind: "expense" }))
        .status,
    ).toBe(409);
    const response = await send("transactions?status=all");
    expect(await response.json()).toMatchObject({ transactions: [{ id }] });
  });

  it("retains archived links on edits, rejects new ones and records edit, void and restore", async () => {
    const original = {
      ...details,
      accountId: "usd",
      activityId: "work",
      kind: "expense",
      amount: "0.01",
      transactionDate: "2026-01-01",
      postingDate: "2026-01-02",
    };
    const added = await send("transactions", "POST", { ...original, id });
    expect(added.status).toBe(201);
    expect(await added.json()).toMatchObject({
      currency: "USD",
      amountMinor: 1,
      postingDate: "2026-01-02",
      activityId: "work",
    });
    expect(
      (await send("accounts/usd", "PATCH", { currency: "MYR" })).status,
    ).toBe(409);
    sqlite.exec(
      "UPDATE accounts SET archived_at = '2026-01-02T00:00:00.000Z' WHERE id = 'usd'; UPDATE activities SET archived_at = '2026-01-02T00:00:00.000Z' WHERE id = 'work'",
    );
    expect(
      (
        await send("transactions", "POST", {
          ...original,
          id: crypto.randomUUID(),
        })
      ).status,
    ).toBe(409);
    expect(
      (await send("transactions", "POST", { ...original, id })).status,
    ).toBe(200);
    const path = `transactions/${id}`;
    const edit = await send(path, "PATCH", {
      ...original,
      description: "Synthetic update",
    });
    expect(edit.status).toBe(200);
    expect(await edit.json()).toMatchObject({
      accountId: "usd",
      activityId: "work",
      description: "Synthetic update",
    });
    expect((await send(path, "PATCH", { voided: true })).status).toBe(200);
    expect((await send(path, "PATCH", { voided: true })).status).toBe(200);
    expect(await (await send("transactions?status=active")).json()).toEqual({
      transactions: [],
    });
    expect(
      await (await send("transactions?status=voided")).json(),
    ).toMatchObject({ transactions: [{ id }] });
    expect((await send(path, "PATCH", original)).status).toBe(409);
    expect(
      await (await send(path, "PATCH", { voided: false })).json(),
    ).toMatchObject({ voidedAt: null });
    const revisions = sqlite
      .prepare(
        "SELECT action, actor, changed_at, previous_state FROM transaction_revisions ORDER BY id",
      )
      .all();
    expect(revisions).toMatchObject(
      ["edit", "void", "restore"].map((action) => ({
        action,
        actor: "owner",
        changed_at: expect.any(String),
      })),
    );
    expect(JSON.parse(String(revisions[0].previous_state))).toMatchObject({
      amountMinor: 1,
      description: null,
      accountId: "usd",
    });
    expect(
      (
        await send(path, "PATCH", {
          ...details,
          activityId: "work",
          accountId: "myr",
        })
      ).status,
    ).toBe(200);
    expect(
      (await send(path, "PATCH", { ...details, activityId: null })).status,
    ).toBe(200);
    expect(
      (await send("accounts/usd", "PATCH", { archived: false })).status,
    ).toBe(200);
    expect(
      (await send("accounts/usd", "PATCH", { currency: "MYR" })).status,
    ).toBe(409);
  });

  it("rejects unauthorized and invalid writes without inserting records", async () => {
    expect(
      (await send("transactions", "POST", { ...details, id }, false)).status,
    ).toBe(403);
    expect(
      (await send(`transactions/${id}`, "PATCH", { voided: true }, false))
        .status,
    ).toBe(403);
    for (const bad of [
      { amount: "0" },
      { amount: "-1" },
      { amount: "1.234" },
      { postingDate: "2026-02-29" },
    ]) {
      expect(
        (await send("transactions", "POST", { ...details, id, ...bad })).status,
      ).toBe(400);
    }
    expect(
      (
        await send("transactions", "POST", {
          ...details,
          id,
          activityId: "missing",
        })
      ).status,
    ).toBe(409);
    expect(await (await send("transactions")).json()).toEqual({
      transactions: [],
    });
  });
});
