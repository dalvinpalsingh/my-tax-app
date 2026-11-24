import { describe, expect, it, vi } from "vitest";
import { handleApi } from "./api";
import hostedWorker from "./index";

const url = "https://app.example.invalid/api/businesses";
const sample = { name: "Sample business", startDate: "2024-02-29" };

function createRequest(body: unknown, origin?: string) {
  return new Request(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(origin ? { Origin: origin } : {}),
    },
    body: JSON.stringify(body),
  });
}

function patchRequest(body: unknown, id = "sample") {
  return new Request(`${url}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Businesses API", () => {
  it.each([undefined, " SAMPLE-001 "])(
    "creates a business with reference %s",
    async (reference) => {
      const run = vi.fn();
      const bind = vi.fn(() => ({ run }));
      const db = { prepare: vi.fn(() => ({ bind })) } as unknown as D1Database;
      const response = await handleApi(
        createRequest({
          ...sample,
          name: " Sample business ",
          registrationReference: reference,
        }),
        db,
        true,
      );
      const business = (await response.json()) as { id: string };
      expect(response.status).toBe(201);
      expect(response.headers.get("Cache-Control")).toBe("private, no-store");
      expect(business).toMatchObject({
        ...sample,
        registrationReference: reference?.trim() ?? null,
      });
      expect(bind).toHaveBeenCalledWith(
        business.id,
        sample.name,
        sample.startDate,
        reference?.trim() ?? null,
      );
      expect(run).toHaveBeenCalledOnce();
    },
  );

  it("lists stored businesses", async () => {
    const business = {
      id: "sample",
      ...sample,
      registrationReference: null,
      archivedAt: null,
    };
    const bind = vi.fn(() => ({ all: async () => ({ results: [business] }) }));
    const db = {
      prepare: () => ({ bind }),
    } as unknown as D1Database;
    const response = await handleApi(new Request(url), db, true);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ businesses: [business] });
    expect(bind).toHaveBeenCalledWith(null, null);
  });

  it.each([
    ["all", null],
    ["active", 0],
    ["archived", 1],
  ] as const)(
    "passes the %s filter to the business query",
    async (status, parameter) => {
      const bind = vi.fn(() => ({ all: async () => ({ results: [] }) }));
      const db = { prepare: () => ({ bind }) } as unknown as D1Database;
      const response = await handleApi(
        new Request(`${url}?status=${status}`),
        db,
        true,
      );
      expect(response.status).toBe(200);
      expect(bind).toHaveBeenCalledWith(parameter, parameter);
    },
  );

  it.each(["/accounts", "/businesses"])(
    "rejects invalid explicit filters for %s",
    async (path) => {
      const prepare = vi.fn();
      const db = { prepare } as unknown as D1Database;
      const response = await handleApi(
        new Request(`https://app.example.invalid/api${path}?status=missing`),
        db,
        true,
      );
      expect(response.status).toBe(400);
      expect(prepare).not.toHaveBeenCalled();
    },
  );

  it("validates business archive requests and rejects unauthorized changes", async () => {
    const prepare = vi.fn();
    const db = { prepare } as unknown as D1Database;
    expect(
      (await handleApi(patchRequest({ archived: true }), db, false)).status,
    ).toBe(403);
    expect(
      (
        await handleApi(
          patchRequest({ archived: true, name: "Other" }),
          db,
          true,
        )
      ).status,
    ).toBe(400);
    expect(prepare).not.toHaveBeenCalled();
  });

  it.each([
    [undefined, 0, null, "PREVIOUS-REF"],
    [null, 1, null, null],
    [" NEW-REF ", 1, "NEW-REF", "NEW-REF"],
  ] as const)(
    "edits a business with reference %s",
    async (reference, provided, parameter, stored) => {
      const updated = {
        id: "sample",
        name: "Updated sample",
        startDate: "2025-04-01",
        registrationReference: stored,
        archivedAt: null,
      };
      const bind = vi.fn(() => ({ first: async () => updated }));
      const db = { prepare: () => ({ bind }) } as unknown as D1Database;
      const response = await handleApi(
        patchRequest({
          name: " Updated sample ",
          startDate: updated.startDate,
          registrationReference: reference,
        }),
        db,
        true,
      );
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(updated);
      expect(bind).toHaveBeenCalledWith(
        updated.name,
        updated.startDate,
        provided,
        parameter,
        updated.id,
      );
    },
  );

  it.each([
    [{ id: "sample" }, 409],
    [null, 404],
  ] as const)(
    "rejects an edit when the active record is unavailable",
    async (record, status) => {
      const prepare = vi
        .fn()
        .mockReturnValueOnce({ bind: () => ({ first: async () => null }) })
        .mockReturnValueOnce({ bind: () => ({ first: async () => record }) });
      const db = { prepare } as unknown as D1Database;
      const response = await handleApi(
        patchRequest({ name: "Edited" }),
        db,
        true,
      );
      expect(response.status).toBe(status);
      expect(prepare.mock.calls[0][0]).toContain("archived_at IS NULL");
    },
  );

  it("rejects invalid and unauthorized business edits before writing", async () => {
    const prepare = vi.fn();
    const db = { prepare } as unknown as D1Database;
    expect(
      (await handleApi(patchRequest({ name: "Edited" }), db, false)).status,
    ).toBe(403);
    for (const invalid of [{}, { name: " " }, { startDate: "2025-02-29" }]) {
      expect((await handleApi(patchRequest(invalid), db, true)).status).toBe(
        400,
      );
    }
    expect(prepare).not.toHaveBeenCalled();
  });

  it.each([
    { name: " " },
    { name: "a".repeat(121) },
    { startDate: "2026-02-29" },
  ])("rejects invalid business details without writing", async (invalid) => {
    const prepare = vi.fn();
    const db = { prepare } as unknown as D1Database;
    const response = await handleApi(
      createRequest({ ...sample, ...invalid }),
      db,
      true,
    );
    expect(response.status).toBe(400);
    expect(prepare).not.toHaveBeenCalled();
  });

  it("rejects cross-origin business submissions", async () => {
    const prepare = vi.fn();
    const db = { prepare } as unknown as D1Database;
    const response = await handleApi(
      createRequest(sample, "https://other.example.invalid"),
      db,
      true,
    );
    expect(response.status).toBe(403);
    expect(prepare).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated reads and writes in the hosted Worker", async () => {
    const prepare = vi.fn();
    const env = {
      DB: { prepare } as unknown as D1Database,
      ACCESS_ISSUER: "",
      ACCESS_AUDIENCE: "",
      ACCESS_EMAIL: "",
    };
    for (const request of [new Request(url), createRequest(sample)]) {
      const response = await hostedWorker.fetch(request, env);
      expect(response.status).toBe(403);
    }
    expect(prepare).not.toHaveBeenCalled();
  });
});
