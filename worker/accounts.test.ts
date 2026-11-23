import { describe, expect, it, vi } from "vitest";
import { exportJWK, generateKeyPair, SignJWT } from "jose";
import worker from "./index";
import { handleApi } from "./accounts";

const url = "https://app.example.invalid/api/accounts";
const sample = {
  name: "Sample operating",
  kind: "business",
  currency: "USD",
  openingBalance: "-12.34",
  openingBalanceDate: "2026-01-01",
};

function createRequest(body: unknown) {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Accounts API", () => {
  it("ignores spoofed identity headers on the hosted Worker", async () => {
    const prepare = vi.fn();
    const env = {
      DB: { prepare } as unknown as D1Database,
      ACCESS_ISSUER: "https://team.example.invalid",
      ACCESS_AUDIENCE: "test-app",
      ACCESS_EMAIL: "owner@example.invalid",
    };
    const request = new Request(url, {
      headers: { "Cf-Access-Authenticated-User-Email": env.ACCESS_EMAIL },
    });
    const response = await worker.fetch(request, env);
    expect(response.status).toBe(403);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(prepare).not.toHaveBeenCalled();
  });

  it("accepts only the supported method without querying D1", async () => {
    const prepare = vi.fn();
    const db = { prepare } as unknown as D1Database;
    const response = await handleApi(
      new Request(url, { method: "DELETE" }),
      db,
      true,
    );
    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("GET, POST");
    expect(prepare).not.toHaveBeenCalled();
  });

  it("rejects an unauthorized account submission before accessing D1", async () => {
    const prepare = vi.fn();
    const db = { prepare } as unknown as D1Database;
    const response = await handleApi(createRequest(sample), db, false);
    expect(response.status).toBe(403);
    expect(prepare).not.toHaveBeenCalled();
  });

  it.each(["12.345", "1e2", "12,30", "NaN", "90071992547409.92"])(
    "rejects invalid or out-of-range balance %s",
    async (openingBalance) => {
      const prepare = vi.fn();
      const db = { prepare } as unknown as D1Database;
      const response = await handleApi(
        createRequest({ ...sample, openingBalance }),
        db,
        true,
      );
      expect(response.status).toBe(400);
      expect(prepare).not.toHaveBeenCalled();
    },
  );

  it("rejects impossible dates", async () => {
    const prepare = vi.fn();
    const db = { prepare } as unknown as D1Database;
    const response = await handleApi(
      createRequest({ ...sample, openingBalanceDate: "2026-02-29" }),
      db,
      true,
    );
    expect(response.status).toBe(400);
    expect(prepare).not.toHaveBeenCalled();
  });

  it.each([
    ["USD", "-12.34", -1234],
    ["MYR", "0.01", 1],
    ["MYR", "90071992547409.91", Number.MAX_SAFE_INTEGER],
  ])(
    "saves %s %s as exact minor units",
    async (currency, openingBalance, minor) => {
      const run = vi.fn();
      const bind = vi.fn(() => ({ run }));
      const db = { prepare: vi.fn(() => ({ bind })) } as unknown as D1Database;
      const response = await handleApi(
        createRequest({ ...sample, currency, openingBalance }),
        db,
        true,
      );
      expect(response.status).toBe(201);
      const account = await response.json();
      expect(account).toMatchObject({
        name: sample.name,
        currency,
        openingBalanceMinor: minor,
      });
      expect(bind).toHaveBeenCalledWith(
        (account as { id: string }).id,
        sample.name,
        currency,
        sample.kind,
        minor,
        sample.openingBalanceDate,
      );
      expect(run).toHaveBeenCalledOnce();
    },
  );

  it("accepts an approved Access application token and rejects a different audience", async () => {
    const issuer = "https://team.example.invalid";
    const email = "owner@example.invalid";
    const { publicKey, privateKey } = await generateKeyPair("RS256");
    const key = {
      ...(await exportJWK(publicKey)),
      kid: "test-key",
      alg: "RS256",
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ keys: [key] })),
    );
    try {
      const env = {
        DB: {
          prepare: () => ({ all: async () => ({ results: [] }) }),
        } as unknown as D1Database,
        ACCESS_ISSUER: issuer,
        ACCESS_AUDIENCE: "accounts",
        ACCESS_EMAIL: email,
      };
      for (const [audience, status] of [
        ["accounts", 200],
        ["other-app", 403],
      ] as const) {
        const token = await new SignJWT({ email, type: "app" })
          .setProtectedHeader({ alg: "RS256", kid: key.kid })
          .setIssuer(issuer)
          .setSubject("synthetic-user")
          .setAudience(audience)
          .setExpirationTime("5m")
          .sign(privateKey);
        const response = await worker.fetch(
          new Request(url, { headers: { "Cf-Access-Jwt-Assertion": token } }),
          env,
        );
        expect(response.status).toBe(status);
      }
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
