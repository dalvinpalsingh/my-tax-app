import { readFileSync } from "node:fs";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Activity } from "../src/activities";
import { handleApi } from "./api";

const details = { name: "Synthetic activity", startDate: "2026-02-15" };
const base = "https://app.example.invalid/api/activities";
let database: DatabaseSync;
let d1: D1Database;

function migration(name: string) {
  return readFileSync(
    new URL(`../migrations/${name}`, import.meta.url),
    "utf8",
  );
}

function request(path = "", body?: unknown, authorized = true) {
  return handleApi(
    new Request(
      base + path,
      body === undefined
        ? undefined
        : {
            method: path ? "PATCH" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          },
    ),
    d1,
    authorized,
  );
}

async function create(body: unknown) {
  const response = await request("", body);
  expect(response.status).toBe(201);
  return (await response.json()) as Activity;
}

beforeEach(() => {
  database = new DatabaseSync(":memory:");
  database.exec(migration("0002_businesses.sql"));
  database.exec(migration("0004_business_archiving.sql"));
  database.exec(`INSERT INTO businesses (id, name, start_date, archived_at) VALUES
    ('first', 'Synthetic Studio', '2025-01-01', NULL),
    ('second', 'Synthetic Workshop', '2025-01-01', NULL),
    ('closed', 'Synthetic Closed', '2025-01-01', '2026-01-01T00:00:00.000Z')`);
  database.exec(migration("0005_activities.sql"));
  d1 = {
    prepare(sql: string) {
      const statement = database.prepare(sql);
      return {
        bind(...values: SQLInputValue[]) {
          return {
            first: async () => statement.get(...values) ?? null,
            all: async () => ({ results: statement.all(...values) }),
          };
        },
      };
    },
  } as unknown as D1Database;
});

afterEach(() => database.close());

describe("Activities API with SQLite migrations", () => {
  it("creates standalone and linked activities and can change or clear a link", async () => {
    const standalone = await create(details);
    expect(standalone.business).toBeNull();
    const linked = await create({ ...details, businessId: "first" });
    expect(linked.business).toMatchObject({
      id: "first",
      name: "Synthetic Studio",
    });
    const path = `/${linked.id}`;
    const changed = await request(path, {
      name: "Changed",
      businessId: "second",
    });
    expect(changed.status).toBe(200);
    expect(await changed.json()).toMatchObject({
      id: linked.id,
      name: "Changed",
      business: { id: "second" },
    });
    const partial = await request(path, { startDate: "2026-03-01" });
    expect(await partial.json()).toMatchObject({
      business: { id: "second" },
      startDate: "2026-03-01",
    });
    const cleared = await request(path, { businessId: null });
    expect(await cleared.json()).toMatchObject({
      id: linked.id,
      business: null,
    });
  });

  it("retains the archived business link and archives or restores activities independently", async () => {
    const activity = await create({ ...details, businessId: "first" });
    const path = `/${activity.id}`;
    database.exec(
      "UPDATE businesses SET archived_at = '2026-02-16T00:00:00.000Z' WHERE id = 'first'",
    );
    const kept = await request(path, { name: "Kept", businessId: "first" });
    expect(kept.status).toBe(200);
    expect(await kept.json()).toMatchObject({
      business: { id: "first", archivedAt: expect.any(String) },
    });
    expect((await request(path, { businessId: "closed" })).status).toBe(409);
    const archived = await request(path, { archived: true });
    expect(archived.status).toBe(200);
    expect(await archived.json()).toMatchObject({
      archivedAt: expect.any(String),
    });
    expect(await (await request("?status=active")).json()).toEqual({
      activities: [],
    });
    expect(await (await request("?status=archived")).json()).toMatchObject({
      activities: [{ id: activity.id }],
    });
    expect(await (await request()).json()).toMatchObject({
      activities: [{ id: activity.id }],
    });
    expect((await request(path, { name: "Blocked" })).status).toBe(409);
    const restored = await request(path, { archived: false });
    expect(await restored.json()).toMatchObject({
      archivedAt: null,
      business: { id: "first" },
    });
  });

  it("rejects invalid, unavailable and unauthorized changes before saving", async () => {
    expect((await request("", details, false)).status).toBe(403);
    expect((await request("/missing", { archived: true }, false)).status).toBe(
      403,
    );
    expect(
      (await request("", { ...details, startDate: "2026-02-29" })).status,
    ).toBe(400);
    expect((await request("", { ...details, name: " " })).status).toBe(400);
    expect(
      (await request("", { ...details, businessId: "closed" })).status,
    ).toBe(409);
    expect(
      (await request("", { ...details, businessId: "missing" })).status,
    ).toBe(409);
    expect((await request("/missing", { name: "Changed" })).status).toBe(404);
    expect((await request("?status=wrong")).status).toBe(400);
    expect(await (await request()).json()).toEqual({ activities: [] });
    expect(database.prepare("SELECT count(*) FROM businesses").get()).toEqual({
      "count(*)": 3,
    });
  });
});
