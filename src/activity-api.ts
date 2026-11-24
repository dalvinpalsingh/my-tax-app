import {
  activitiesResponse,
  activitySchema,
  type PatchActivityInput,
} from "./activities";

const url = "/api/activities";
export const activitiesQueryKey = ["activities"];

export async function fetchActivities(signal: AbortSignal) {
  const response = await fetch(`${url}?status=all`, {
    signal,
    cache: "no-store",
  });
  if (response.status === 403)
    throw new Error("Sign in with your approved account to continue.");
  if (!response.ok) throw new Error("Activities are temporarily unavailable.");
  return activitiesResponse.parse(await response.json()).activities;
}

export async function saveActivity(input: PatchActivityInput, id?: string) {
  const response = await fetch(id ? `${url}/${encodeURIComponent(id)}` : url, {
    method: id ? "PATCH" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (response.status === 403)
    throw new Error("Sign in with your approved account to continue.");
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(
      body &&
        typeof body === "object" &&
        "error" in body &&
        typeof body.error === "string"
        ? body.error
        : "Could not save the activity.",
    );
  }
  return activitySchema.parse(await response.json());
}
