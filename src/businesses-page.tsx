import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Plus } from "lucide-react";
import { useLayoutEffect, useState, type FormEvent } from "react";
import { Navigate } from "react-router";
import {
  businessesResponse,
  businessSchema,
  createBusinessSchema,
} from "./businesses";
import type {
  Business,
  BusinessDetails,
  CreateBusinessInput,
  PatchBusinessInput,
} from "./businesses";
import { dateFormat } from "./display";
import { ArchiveConfirmation, RecordAction } from "./record-action";
import { RecordLoadingStatus, RecordRefreshButton } from "./record-results";
import {
  RecordStatusNav,
  statusLabels,
  useRecordStatus,
} from "./record-status-nav";
import type { RecordStatus } from "./record-status";
import {
  recordNameMaxLength,
  registrationReferenceMaxLength,
} from "./validation-limits";

const queryKey = ["businesses"];
const emptyMessage = {
  all: "No businesses have been recorded yet.",
  active: "No active businesses.",
  archived: "No archived businesses.",
} satisfies Record<RecordStatus, string>;

async function fetchBusinesses(status: RecordStatus, signal: AbortSignal) {
  const response = await fetch(`/api/businesses?status=${status}`, {
    signal,
    cache: "no-store",
  });
  if (response.status === 403)
    throw new Error("Sign in with your approved account to continue.");
  if (!response.ok) throw new Error("Businesses are temporarily unavailable.");
  return businessesResponse.parse(await response.json()).businesses;
}

async function writeBusiness(
  url: string,
  method: "POST" | "PATCH",
  input: CreateBusinessInput | PatchBusinessInput,
) {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (response.status === 403)
    throw new Error("Sign in with your approved account to continue.");
  if (response.status === 400)
    throw new Error("Check the business details and try again.");
  if (response.status === 404)
    throw new Error("Business not found. Refresh the business list.");
  if (response.status === 409)
    throw new Error("Restore this business before editing it.");
  if (!response.ok)
    throw new Error(
      "Could not save the business. Check the list before trying again.",
    );
  return businessSchema.parse(await response.json());
}

function BusinessForm({
  business,
  onSaved,
  onCancel,
}: {
  business?: Business;
  onSaved: (business: Business) => void;
  onCancel: () => void;
}) {
  const client = useQueryClient();
  const [validation, setValidation] = useState("");
  const save = useMutation({
    mutationFn: (input: BusinessDetails) =>
      business
        ? writeBusiness(
            `/api/businesses/${encodeURIComponent(business.id)}`,
            "PATCH",
            input,
          )
        : writeBusiness("/api/businesses", "POST", {
            ...input,
            registrationReference: input.registrationReference ?? undefined,
          }),
    onSuccess: () => void client.invalidateQueries({ queryKey }),
  });

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
    save.mutate(result.data, { onSuccess: onSaved });
  }

  return (
    <form
      className="account-form"
      aria-labelledby="business-form-heading"
      onSubmit={submit}
    >
      <h2 id="business-form-heading">
        {business ? "Edit business" : "Add business"}
      </h2>
      <fieldset disabled={save.isPending}>
        <div className="form-fields">
          <label>
            Business name
            <input
              name="name"
              type="text"
              required
              maxLength={recordNameMaxLength}
              defaultValue={business?.name}
              autoFocus={!!business}
            />
          </label>
          <label>
            Start date
            <input
              name="startDate"
              type="date"
              required
              defaultValue={business?.startDate}
            />
          </label>
          <label>
            Registration reference (optional)
            <input
              name="registrationReference"
              type="text"
              maxLength={registrationReferenceMaxLength}
              defaultValue={business?.registrationReference ?? undefined}
            />
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
  const { data: status } = useRecordStatus();
  if (!status) return <Navigate to="/businesses" replace />;
  return <BusinessesView status={status} />;
}

function BusinessesView({ status }: { status: RecordStatus }) {
  const client = useQueryClient();
  const [editor, setEditor] = useState<Business | "new" | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [saved, setSaved] = useState("");
  const query = useQuery({
    queryKey: [...queryKey, status],
    queryFn: ({ signal }) => fetchBusinesses(status, signal),
  });
  const { mutate, reset, isPending, error } = useMutation({
    mutationFn: ({ id, archived }: { id: string; archived: boolean }) =>
      writeBusiness(`/api/businesses/${encodeURIComponent(id)}`, "PATCH", {
        archived,
      }),
    onSuccess: () => client.invalidateQueries({ queryKey }),
  });

  useLayoutEffect(() => {
    setEditor(null);
    setConfirming(null);
    setSaved("");
    reset();
  }, [status, reset]);

  function openEditor(business: Business | "new") {
    setConfirming(null);
    reset();
    setSaved("");
    setEditor(business);
  }

  function setArchived(id: string, archived: boolean) {
    setSaved("");
    mutate(
      { id, archived },
      {
        onSuccess: (business) => {
          setConfirming(null);
          setSaved(
            `${business.name} ${business.archivedAt ? "archived" : "restored"}.`,
          );
        },
      },
    );
  }

  const actionsDisabled = !!editor || !!confirming || isPending;

  return (
    <main>
      <div className="page-title">
        <h1>Businesses</h1>
        <div className="page-actions">
          <RecordRefreshButton
            onRefresh={() => void query.refetch({ cancelRefetch: false })}
          />
          <button
            className="primary-button"
            data-reserve-space={status === "archived" || !!editor}
            disabled={isPending}
            onClick={() => openEditor("new")}
          >
            <Plus aria-hidden="true" size={16} /> Add business
          </button>
        </div>
      </div>
      <RecordStatusNav
        path="/businesses"
        status={status}
        label="Business status"
      />
      <section aria-label="Business results">
        <RecordLoadingStatus
          records="businesses"
          isFetching={query.isFetching}
          isPending={query.isPending}
        />
        {editor && (
          <BusinessForm
            key={editor === "new" ? "new" : editor.id}
            business={editor === "new" ? undefined : editor}
            onCancel={() => setEditor(null)}
            onSaved={(business) => {
              setEditor(null);
              setSaved(
                `${business.name} ${editor === "new" ? "added" : "updated"}.`,
              );
            }}
          />
        )}
        {saved && (
          <p className="save-status" role="status">
            {saved}
          </p>
        )}
        {query.isError && <p role="alert">{query.error.message}</p>}
        {error && <p role="alert">{error.message}</p>}
        {query.data?.length === 0 && <p>{emptyMessage[status]}</p>}
        {!!query.data?.length && (
          <ul
            className="record-grid"
            aria-label={`${statusLabels[status]} businesses`}
          >
            {query.data.map((business) => (
              <li key={business.id}>
                <div className="account-heading">
                  <div className="account-icon">
                    <Building2 aria-hidden="true" size={20} />
                  </div>
                  {status === "all" && business.archivedAt && (
                    <span className="account-archived-label">
                      {statusLabels.archived}
                    </span>
                  )}
                </div>
                <h2>{business.name}</h2>
                <p className="date">
                  Started{" "}
                  <time dateTime={business.startDate}>
                    {dateFormat.format(new Date(business.startDate))}
                  </time>
                </p>
                <div className="business-card-reference date wrap-anywhere">
                  {business.registrationReference && (
                    <>
                      Registration reference: {business.registrationReference}
                    </>
                  )}
                </div>
                <div className="account-card-actions">
                  {confirming === business.id ? (
                    <ArchiveConfirmation
                      name={business.name}
                      record="business"
                      pending={isPending}
                      onConfirm={() => setArchived(business.id, true)}
                      onCancel={() => {
                        setConfirming(null);
                        reset();
                      }}
                    />
                  ) : (
                    <div className="page-actions">
                      {business.archivedAt ? (
                        <RecordAction
                          action="Restore"
                          name={business.name}
                          disabled={actionsDisabled}
                          onClick={() => setArchived(business.id, false)}
                        />
                      ) : (
                        <>
                          <RecordAction
                            action="Edit"
                            name={business.name}
                            disabled={actionsDisabled}
                            onClick={() => openEditor(business)}
                          />
                          <RecordAction
                            action="Archive"
                            name={business.name}
                            disabled={actionsDisabled}
                            onClick={() => {
                              setSaved("");
                              reset();
                              setConfirming(business.id);
                            }}
                          />
                        </>
                      )}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
