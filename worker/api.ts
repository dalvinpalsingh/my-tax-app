import { createAccount, listAccounts, updateAccount } from "./accounts";
import { createBusiness, listBusinesses, updateBusiness } from "./businesses";
import { recordStatusSchema } from "../src/record-status";
import { maxRecordBodyBytes } from "../src/validation-limits";

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
  const route = /^\/api\/(accounts|businesses)(?:\/([a-zA-Z0-9_-]+))?$/.exec(
    url.pathname,
  );
  if (!route) return json({ error: "Not found" }, 404);
  const [, resource, id] = route;
  const isBusiness = resource === "businesses";
  const method = request.method;
  const allowed = id ? ["PATCH"] : ["GET", "POST"];
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
        if (size > maxRecordBodyBytes) {
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
      if (id && isBusiness) {
        const result = await updateBusiness(db, id, body);
        return json(result.business ?? { error: result.error }, result.status);
      }
      if (id) {
        const result = await updateAccount(db, id, body);
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
  const status = recordStatusSchema.safeParse(
    url.searchParams.get("status") ?? (isBusiness ? "all" : "active"),
  );
  if (!status.success) return json({ error: "Invalid status filter." }, 400);
  try {
    const list = isBusiness ? listBusinesses : listAccounts;
    return json(await list(db, status.data));
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
