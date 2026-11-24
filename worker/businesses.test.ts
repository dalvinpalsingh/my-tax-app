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
    const business = { id: "sample", ...sample, registrationReference: null };
    const db = {
      prepare: () => ({ all: async () => ({ results: [business] }) }),
    } as unknown as D1Database;
    const response = await handleApi(new Request(url), db, true);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ businesses: [business] });
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
