import { businessesResponse, createBusinessSchema } from "../src/businesses";
import type { Business } from "../src/businesses";

export async function listBusinesses(db: D1Database) {
  const { results } = await db
    .prepare(
      `SELECT id, name, start_date AS startDate,
        registration_reference AS registrationReference
        FROM businesses ORDER BY name, start_date, id`,
    )
    .all<Business>();
  return businessesResponse.parse({ businesses: results });
}

export async function createBusiness(db: D1Database, body: unknown) {
  const result = createBusinessSchema.safeParse(body);
  if (!result.success) return null;
  const business: Business = { id: crypto.randomUUID(), ...result.data };
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
