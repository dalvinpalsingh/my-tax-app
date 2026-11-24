import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Plus, RefreshCw } from "lucide-react";
import { useState, type FormEvent } from "react";
import {
  businessesResponse,
  businessSchema,
  createBusinessSchema,
} from "./businesses";
import type { Business, CreateBusinessInput } from "./businesses";

const queryKey = ["businesses"];
const dateFormat = new Intl.DateTimeFormat("en-MY", {
  dateStyle: "medium",
  timeZone: "Asia/Kuala_Lumpur",
});

async function fetchBusinesses(signal: AbortSignal) {
  const response = await fetch("/api/businesses", {
    signal,
    cache: "no-store",
  });
  if (response.status === 403)
    throw new Error("Sign in with your approved account to continue.");
  if (!response.ok) throw new Error("Businesses are temporarily unavailable.");
  return businessesResponse.parse(await response.json()).businesses;
}

async function saveBusiness(input: CreateBusinessInput) {
  const response = await fetch("/api/businesses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (response.status === 403)
    throw new Error("Sign in with your approved account to continue.");
  if (response.status === 400)
    throw new Error("Check the business details and try again.");
  if (response.status !== 201)
    throw new Error(
      "Could not save the business. Check the list before trying again.",
    );
  return businessSchema.parse(await response.json());
}

function BusinessForm({
  onSaved,
  onCancel,
}: {
  onSaved: (business: Business) => void;
  onCancel: () => void;
}) {
  const [validation, setValidation] = useState("");
  const save = useMutation({ mutationFn: saveBusiness, onSuccess: onSaved });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (save.isPending) return;
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const result = createBusinessSchema.safeParse(values);
    if (!result.success) {
      setValidation(result.error.issues[0].message);
      return;
    }
    setValidation("");
    save.mutate({
      ...result.data,
      registrationReference: result.data.registrationReference ?? undefined,
    });
  }

  return (
    <form
      className="account-form"
      aria-labelledby="new-business-heading"
      onSubmit={submit}
    >
      <h2 id="new-business-heading">Add business</h2>
      <fieldset disabled={save.isPending}>
        <div className="form-fields">
          <label>
            Business name
            <input name="name" type="text" required maxLength={120} />
          </label>
          <label>
            Start date
            <input name="startDate" type="date" required />
          </label>
          <label>
            Registration reference (optional)
            <input name="registrationReference" type="text" maxLength={120} />
          </label>
        </div>
        {(validation || save.error) && (
          <p role="alert">{validation || save.error?.message}</p>
        )}
        <div className="page-actions">
          <button className="primary-button" type="submit">
            {save.isPending ? "Saving…" : "Save business"}
          </button>
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </fieldset>
    </form>
  );
}

export function Businesses() {
  const client = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [saved, setSaved] = useState("");
  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) => fetchBusinesses(signal),
  });

  return (
    <main>
      <div className="page-title">
        <h1>Businesses</h1>
        <div className="page-actions">
          <button
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          >
            <RefreshCw aria-hidden="true" size={16} />
            {query.isFetching ? "Refreshing…" : "Refresh"}
          </button>
          {!adding && (
            <button
              className="primary-button"
              onClick={() => {
                setSaved("");
                setAdding(true);
              }}
            >
              <Plus aria-hidden="true" size={16} />
              Add business
            </button>
          )}
        </div>
      </div>
      {adding && (
        <BusinessForm
          onCancel={() => setAdding(false)}
          onSaved={(business) => {
            setAdding(false);
            setSaved(`${business.name} added.`);
            void client.invalidateQueries({ queryKey });
          }}
        />
      )}
      {saved && (
        <p className="save-status" role="status">
          {saved}
        </p>
      )}
      {query.isPending && <p role="status">Loading businesses…</p>}
      {query.isError && <p role="alert">{query.error.message}</p>}
      {query.data?.length === 0 && <p>No businesses have been recorded yet.</p>}
      {!!query.data?.length && (
        <ul className="accounts" aria-label="Businesses">
          {query.data.map((business) => (
            <li key={business.id}>
              <div className="account-icon">
                <Building2 aria-hidden="true" size={20} />
              </div>
              <h2>{business.name}</h2>
              <p className="date">
                Started{" "}
                <time dateTime={business.startDate}>
                  {dateFormat.format(new Date(business.startDate))}
                </time>
              </p>
              {business.registrationReference && (
                <p className="date break-words">
                  Registration reference: {business.registrationReference}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
