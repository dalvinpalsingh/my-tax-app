import {
  businessSchema,
  businessesResponse,
  createBusinessSchema,
  patchBusinessSchema,
} from "../src/businesses";
import type { Business } from "../src/businesses";
import { archivedFilter, type RecordStatus } from "../src/record-status";

const businessColumns = `id, name, start_date AS startDate,
  registration_reference AS registrationReference, archived_at AS archivedAt`;

export async function listBusinesses(db: D1Database, status: RecordStatus) {
  const filter = archivedFilter(status);
  const { results } = await db
    .prepare(
      `SELECT ${businessColumns} FROM businesses
       WHERE ? IS NULL OR (archived_at IS NOT NULL) = ? ORDER BY name, start_date, id`,
    )
    .bind(filter, filter)
    .all<Business>();
  return businessesResponse.parse({ businesses: results });
}

export async function createBusiness(db: D1Database, body: unknown) {
  const result = createBusinessSchema.safeParse(body);
  if (!result.success) return null;
  const business: Business = {
    id: crypto.randomUUID(),
    ...result.data,
    archivedAt: null,
  };
  await db
    .prepare(
      `INSERT INTO businesses (id, name, start_date, registration_reference)
       VALUES (?, ?, ?, ?)`,
    )
    .bind(
      business.id,
      business.name,
      business.startDate,
      business.registrationReference,
    )
    .run();
  return business;
}

export async function updateBusiness(
  db: D1Database,
  id: string,
  body: unknown,
) {
  const result = patchBusinessSchema.safeParse(body);
  if (!result.success)
    return { status: 400, error: "Enter valid business details." };

  const details = result.data;
  if ("archived" in details) {
    const business = await db
      .prepare(
        `UPDATE businesses SET archived_at = CASE WHEN ? THEN COALESCE(archived_at, ?) ELSE NULL END
         WHERE id = ? RETURNING ${businessColumns}`,
      )
      .bind(Number(details.archived), new Date().toISOString(), id)
      .first<Business>();
    return business
      ? { status: 200, business: businessSchema.parse(business) }
      : { status: 404, error: "Business not found." };
  }

  const business = await db
    .prepare(
      `UPDATE businesses SET name = COALESCE(?, name), start_date = COALESCE(?, start_date),
         registration_reference = CASE WHEN ? THEN ? ELSE registration_reference END
       WHERE id = ? AND archived_at IS NULL RETURNING ${businessColumns}`,
    )
    .bind(
      details.name ?? null,
      details.startDate ?? null,
      Number(details.registrationReference !== undefined),
      details.registrationReference || null,
      id,
    )
    .first<Business>();
  if (business)
    return { status: 200, business: businessSchema.parse(business) };

  const exists = await db
    .prepare("SELECT id FROM businesses WHERE id = ?")
    .bind(id)
    .first();
  return exists
    ? { status: 409, error: "Restore this business before editing it." }
    : { status: 404, error: "Business not found." };
}
