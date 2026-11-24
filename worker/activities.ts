import {
  activitiesResponse,
  activitySchema,
  createActivitySchema,
  patchActivitySchema,
  type Activity,
} from "../src/activities";
import { archivedFilter, type RecordStatus } from "../src/record-status";

type ActivityRow = Omit<Activity, "business"> & {
  businessId: string | null;
  businessName: string | null;
  businessArchivedAt: string | null;
};

const activitySelect = `SELECT a.id, a.name, a.start_date AS startDate,
  a.archived_at AS archivedAt, b.id AS businessId, b.name AS businessName,
  b.archived_at AS businessArchivedAt
  FROM activities AS a LEFT JOIN businesses AS b ON a.business_id = b.id`;

function toActivity({
  businessId,
  businessName,
  businessArchivedAt,
  ...activity
}: ActivityRow) {
  return activitySchema.parse({
    ...activity,
    business:
      businessId === null
        ? null
        : {
            id: businessId,
            name: businessName,
            archivedAt: businessArchivedAt,
          },
  });
}

async function getActivity(db: D1Database, id: string) {
  const row = await db
    .prepare(`${activitySelect} WHERE a.id = ?`)
    .bind(id)
    .first<ActivityRow>();
  return row && toActivity(row);
}

export async function listActivities(db: D1Database, status: RecordStatus) {
  const filter = archivedFilter(status);
  const { results } = await db
    .prepare(
      `${activitySelect}
    WHERE ? IS NULL OR (a.archived_at IS NOT NULL) = ? ORDER BY a.name, a.start_date, a.id`,
    )
    .bind(filter, filter)
    .all<ActivityRow>();
  return activitiesResponse.parse({ activities: results.map(toActivity) });
}

const invalid = { status: 400, error: "Enter valid activity details." };
const unavailableBusiness = {
  status: 409,
  error: "Select an active business or leave the activity unlinked.",
};
const missing = { status: 404, error: "Activity not found." };

export async function createActivity(db: D1Database, body: unknown) {
  const result = createActivitySchema.safeParse(body);
  if (!result.success) return invalid;
  const { name, startDate, businessId = null } = result.data;
  const id = crypto.randomUUID();
  const inserted = await db
    .prepare(
      `INSERT INTO activities (id, name, start_date, business_id)
    SELECT ?, ?, ?, ? WHERE ? IS NULL OR EXISTS (
      SELECT 1 FROM businesses WHERE id = ? AND archived_at IS NULL
    ) RETURNING id`,
    )
    .bind(id, name, startDate, businessId, businessId, businessId)
    .first();
  if (!inserted) return unavailableBusiness;
  return { status: 201, activity: await getActivity(db, id) };
}

export async function updateActivity(
  db: D1Database,
  id: string,
  body: unknown,
) {
  const result = patchActivitySchema.safeParse(body);
  if (!result.success) return invalid;
  const details = result.data;

  if ("archived" in details) {
    const updated = await db
      .prepare(
        `UPDATE activities
      SET archived_at = CASE WHEN ? THEN COALESCE(archived_at, ?) ELSE NULL END
      WHERE id = ? RETURNING id`,
      )
      .bind(Number(details.archived), new Date().toISOString(), id)
      .first();
    return updated
      ? { status: 200, activity: await getActivity(db, id) }
      : missing;
  }

  const writesBusiness = Number(details.businessId !== undefined);
  const businessId = details.businessId ?? null;
  const updated = await db
    .prepare(
      `UPDATE activities
    SET name = COALESCE(?, name), start_date = COALESCE(?, start_date),
      business_id = CASE WHEN ? THEN ? ELSE business_id END
    WHERE id = ? AND archived_at IS NULL AND (
      ? = 0 OR ? IS NULL OR ? = business_id OR EXISTS (
        SELECT 1 FROM businesses WHERE id = ? AND archived_at IS NULL
      )
    ) RETURNING id`,
    )
    .bind(
      details.name ?? null,
      details.startDate ?? null,
      writesBusiness,
      businessId,
      id,
      writesBusiness,
      businessId,
      businessId,
      businessId,
    )
    .first();
  if (updated) return { status: 200, activity: await getActivity(db, id) };

  const activity = await getActivity(db, id);
  if (!activity) return missing;
  if (activity.archivedAt)
    return { status: 409, error: "Restore this activity before editing it." };
  return unavailableBusiness;
}
