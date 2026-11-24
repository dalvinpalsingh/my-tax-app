import { readFileSync } from "node:fs";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { accountsResponse, accountSchema } from "../src/accounts";
import { handleApi } from "./api";

const url = "https://app.example.invalid/api/accounts";
const migration = (name: string) =>
  readFileSync(new URL(`../migrations/${name}`, import.meta.url), "utf8");

function invoke(
  path: string,
  body?: unknown,
  authorized = true,
  origin?: string,
) {
  const request = new Request(
    url + path,
    body === undefined
      ? undefined
      : {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(origin ? { Origin: origin } : {}),
          },
          body: JSON.stringify(body),
        },
  );
  return handleApi(request, db, authorized);
}

let sqlite: DatabaseSync;
let db: D1Database;
const prepare = vi.fn((sql: string) => ({
  bind: (...values: SQLInputValue[]) => {
    const statement = sqlite.prepare(sql);
    return {
      first: async () => statement.get(...values) ?? null,
      all: async () => ({ results: statement.all(...values) }),
    };
  },
}));

beforeEach(() => {
  prepare.mockClear();
  sqlite = new DatabaseSync(":memory:");
  sqlite.exec(migration("0001_accounts.sql"));
  sqlite.exec(`INSERT INTO accounts VALUES
    ('sample-account', 'Sample account', 'MYR', 'business', 125050, '2026-01-01')`);
  sqlite.exec(migration("0003_account_archiving.sql"));
  db = { prepare } as unknown as D1Database;
});

afterEach(() => sqlite.close());

describe("Account changes", () => {
  it("supports the combined list without changing the active-only default", async () => {
    sqlite.exec(`INSERT INTO accounts VALUES
      ('sample-archived', 'Sample archived', 'USD', 'personal', 123, '2026-01-01', '2026-01-02T00:00:00Z')`);
    for (const [filter, ids] of [
      ["", ["sample-account"]],
      ["?status=active", ["sample-account"]],
      ["?status=archived", ["sample-archived"]],
      ["?status=all", ["sample-account", "sample-archived"]],
    ] as const) {
      const response = await invoke(filter);
      expect(response.status).toBe(200);
      const { accounts } = accountsResponse.parse(await response.json());
      expect(accounts.map((account) => account.id)).toEqual(ids);
    }
  });

  it("keeps pre-existing accounts active and edits only supplied fields", async () => {
    const list = await invoke("");
    expect(accountsResponse.parse(await list.json()).accounts).toMatchObject([
      { id: "sample-account", archivedAt: null, openingBalanceMinor: 125050 },
    ]);

    const rename = await invoke("/sample-account", {
      name: "  Renamed account ",
    });
    expect(rename.status).toBe(200);
    expect(accountSchema.parse(await rename.json())).toEqual({
      id: "sample-account",
      name: "Renamed account",
      currency: "MYR",
      kind: "business",
      openingBalanceMinor: 125050,
      openingBalanceDate: "2026-01-01",
      archivedAt: null,
    });

    const zero = await invoke("/sample-account", {
      kind: "personal",
      currency: "USD",
      openingBalance: "0.00",
      openingBalanceDate: "2025-01-01",
    });
    expect(zero.status).toBe(200);
    expect(accountSchema.parse(await zero.json())).toMatchObject({
      name: "Renamed account",
      kind: "personal",
      currency: "USD",
      openingBalanceMinor: 0,
      openingBalanceDate: "2025-01-01",
    });
  });

  it("archives idempotently, prevents archived edits, and restores saved details", async () => {
    const archive = await invoke("/sample-account", { archived: true });
    expect(archive.status).toBe(200);
    const saved = accountSchema.parse(await archive.json());
    expect(saved.archivedAt).not.toBeNull();
    const repeat = await invoke("/sample-account", { archived: true });
    expect(await repeat.json()).toEqual(saved);

    expect(await (await invoke("")).json()).toEqual({ accounts: [] });
    expect(await (await invoke("?status=archived")).json()).toEqual({
      accounts: [saved],
    });
    expect(
      (await invoke("/sample-account", { name: "Unwanted change" })).status,
    ).toBe(409);

    const restored = await invoke("/sample-account", { archived: false });
    expect(restored.status).toBe(200);
    const active = { ...saved, archivedAt: null };
    expect(await restored.json()).toEqual(active);
    expect(
      await (await invoke("/sample-account", { archived: false })).json(),
    ).toEqual(active);
    expect(await (await invoke("?status=archived")).json()).toEqual({
      accounts: [],
    });
    expect(await (await invoke("")).json()).toEqual({ accounts: [active] });
    expect(
      (await invoke("/sample-account", { name: "Edited after restore" }))
        .status,
    ).toBe(200);
  });

  it.each([
    {},
    { name: " " },
    { openingBalance: "1.001" },
    { openingBalanceDate: "2026-02-29" },
    { currency: null },
    { archived: true, name: "Mixed action" },
  ])("rejects an invalid patch without querying D1", async (patch) => {
    expect((await invoke("/sample-account", patch)).status).toBe(400);
    expect(prepare).not.toHaveBeenCalled();
  });

  it("rejects unauthorized and cross-origin writes before querying D1", async () => {
    expect(
      (await invoke("/sample-account", { archived: true }, false)).status,
    ).toBe(403);
    expect(
      (
        await invoke(
          "/sample-account",
          { archived: true },
          true,
          "https://other.example.invalid",
        )
      ).status,
    ).toBe(403);
    expect(prepare).not.toHaveBeenCalled();
  });

  it("returns not found for edits and status changes to a missing account", async () => {
    expect((await invoke("/missing", { name: "Missing" })).status).toBe(404);
    expect((await invoke("/missing", { archived: true })).status).toBe(404);
  });
});
