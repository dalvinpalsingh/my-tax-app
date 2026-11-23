import { accountsResponse, createAccountSchema } from "../src/accounts";
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
  if (request.method === "POST") {
    const origin = request.headers.get("Origin");
    if (origin && origin !== new URL(request.url).origin)
      return json({ error: "Access required" }, 403);
    const contentType = request.headers
      .get("Content-Type")
      ?.split(";")[0]
      ?.trim()
      .toLowerCase();
    if (contentType !== "application/json")
      return json({ error: "Send account details as JSON." }, 415);

    let body: unknown;
    try {
      const reader = request.body?.getReader();
      if (!reader) return json({ error: "Enter valid account details." }, 400);
      const decoder = new TextDecoder("utf-8", { fatal: true });
      let size = 0;
      let text = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 4096) {
          await reader.cancel();
          return json({ error: "Account details are too large." }, 413);
        }
        text += decoder.decode(value, { stream: true });
      }
      body = JSON.parse(text + decoder.decode());
    } catch {
      return json({ error: "Enter valid account details." }, 400);
    }

    const result = createAccountSchema.safeParse(body);
    if (!result.success)
      return json({ error: "Enter valid account details." }, 400);
    const account: Account = { id: crypto.randomUUID(), ...result.data };
    try {
      await db
        .prepare(
          `INSERT INTO accounts (id, name, currency, kind, opening_balance_minor, opening_balance_date)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          account.id,
          account.name,
          account.currency,
          account.kind,
          account.openingBalanceMinor,
          account.openingBalanceDate,
        )
        .run();
      return json(account, 201);
    } catch {
      return json(
        {
          error:
            "Could not save the account. Check the list before trying again.",
        },
        503,
      );
    }
  }
  if (request.method !== "GET") {
    return json({ error: "Method not allowed" }, 405, { Allow: "GET, POST" });
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
