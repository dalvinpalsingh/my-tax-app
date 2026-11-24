import { createAccount, listAccounts, updateAccount } from "./accounts";
import { createBusiness, listBusinesses } from "./businesses";

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
  const url = new URL(request.url);
  const isBusiness = url.pathname === "/api/businesses";
  const accountId = /^\/api\/accounts\/([a-zA-Z0-9_-]+)$/.exec(
    url.pathname,
  )?.[1];
  if (!isBusiness && !accountId && url.pathname !== "/api/accounts")
    return json({ error: "Not found" }, 404);
  const method = request.method;
  const allowed = accountId ? ["PATCH"] : ["GET", "POST"];
  if (!allowed.includes(method))
    return json({ error: "Method not allowed" }, 405, {
      Allow: allowed.join(", "),
    });

  const noun = isBusiness ? "business" : "account";
  if (method !== "GET") {
    const origin = request.headers.get("Origin");
    if (origin && origin !== url.origin)
      return json({ error: "Access required" }, 403);
    const contentType = request.headers
      .get("Content-Type")
      ?.split(";")[0]
      ?.trim()
      .toLowerCase();
    if (contentType !== "application/json")
      return json({ error: `Send ${noun} details as JSON.` }, 415);

    let body: unknown;
    try {
      const reader = request.body?.getReader();
      if (!reader) return json({ error: `Enter valid ${noun} details.` }, 400);
      const decoder = new TextDecoder("utf-8", { fatal: true });
      let size = 0;
      let text = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 4096) {
          await reader.cancel();
          return json(
            {
              error: isBusiness
                ? "Business details are too large."
                : "Account details are too large.",
            },
            413,
          );
        }
        text += decoder.decode(value, { stream: true });
      }
      body = JSON.parse(text + decoder.decode());
    } catch {
      return json({ error: `Enter valid ${noun} details.` }, 400);
    }

    try {
      if (accountId) {
        const result = await updateAccount(db, accountId, body);
        return json(result.account ?? { error: result.error }, result.status);
      }
      const create = isBusiness ? createBusiness : createAccount;
      const record = await create(db, body);
      if (!record) return json({ error: `Enter valid ${noun} details.` }, 400);
      return json(record, 201);
    } catch {
      return json(
        {
          error: `Could not save the ${noun}. Check the list before trying again.`,
        },
        503,
      );
    }
  }
  try {
    if (isBusiness) return json(await listBusinesses(db));
    const status = url.searchParams.get("status");
    return json(
      await listAccounts(db, status === "all" ? null : status === "archived"),
    );
  } catch {
    return json(
      {
        error: isBusiness
          ? "Businesses are temporarily unavailable"
          : "Accounts are temporarily unavailable",
      },
      503,
    );
  }
}
