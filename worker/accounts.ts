import { accountsResponse } from "../src/accounts";
import type { Account } from "../src/accounts";

export async function handleApi(
  request: Request,
  db: D1Database,
  authorized: boolean,
) {
  const headers = { "Cache-Control": "private, no-store" };
  function json(body: unknown, status = 200, extraHeaders = {}) {
    return Response.json(body, {
      status,
      headers: { ...headers, ...extraHeaders },
    });
  }

  if (!authorized) return json({ error: "Access required" }, 403);
  if (new URL(request.url).pathname !== "/api/accounts")
    return json({ error: "Not found" }, 404);
  if (request.method !== "GET") {
    return json({ error: "Method not allowed" }, 405, { Allow: "GET" });
  }

  try {
    const { results } = await db
      .prepare(
        `SELECT id, name, currency, kind,
          opening_balance_minor AS openingBalanceMinor,
          opening_balance_date AS openingBalanceDate
          FROM accounts ORDER BY name, id`,
      )
      .all<Account>();
    return json(accountsResponse.parse({ accounts: results }));
  } catch {
    return json({ error: "Accounts are temporarily unavailable" }, 503);
  }
}
