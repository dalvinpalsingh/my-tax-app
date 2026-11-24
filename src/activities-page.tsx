import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ListChecks, Plus } from "lucide-react";
import { useLayoutEffect, useState, type FormEvent } from "react";
import { Navigate } from "react-router";
import {
  createActivitySchema,
  type Activity,
  type CreateActivityInput,
} from "./activities";
import {
  activitiesQueryKey,
  fetchActivities,
  saveActivity,
} from "./activity-api";
import { businessesQueryOptions, refreshBusinessChoices } from "./business-api";
import { dateFormat } from "./display";
import { PageHeader } from "./page-header";
import { ArchiveConfirmation, RecordAction } from "./record-action";
import { filterRecordsByStatus, recordListCacheOptions } from "./record-list";
import { RecordLoadingStatus, RecordRefreshButton } from "./record-results";
import type { RecordStatus } from "./record-status";
import {
  RecordStatusNav,
  statusLabels,
  useRecordStatus,
} from "./record-status-nav";
import { recordNameMaxLength } from "./validation-limits";
import { transactionsQueryKey } from "./transaction-api";

const path = "/activities";
const emptyMessage = {
  all: "No activities have been recorded yet.",
  active: "No active activities.",
  archived: "No archived activities.",
} satisfies Record<RecordStatus, string>;

function ActivityForm({
  activity,
  onSaved,
  onCancel,
}: {
  activity?: Activity;
  onSaved: (activity: Activity) => void;
  onCancel: () => void;
}) {
  const client = useQueryClient();
  const [validation, setValidation] = useState("");
  const [businessId, setBusinessId] = useState(activity?.business?.id ?? "");
  const businesses = useQuery(businessesQueryOptions);
  const activeBusinesses = filterRecordsByStatus(businesses.data, "active");
  const linkedBusiness = activity?.business;
  const currentBusiness =
    businesses.data?.find((business) => business.id === linkedBusiness?.id) ??
    linkedBusiness;
  const outsideChoices =
    currentBusiness &&
    !activeBusinesses?.some((business) => business.id === currentBusiness.id)
      ? currentBusiness
      : null;
  const save = useMutation({
    mutationFn: (input: CreateActivityInput) =>
      saveActivity(input, activity?.id),
    onSuccess: (saved) => {
      void client.invalidateQueries({ queryKey: activitiesQueryKey });
      void refreshBusinessChoices(client);
      if (activity && activity.name !== saved.name) {
        void client.invalidateQueries({ queryKey: transactionsQueryKey });
      }
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (save.isPending) return;
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const result = createActivitySchema.safeParse({
      ...values,
      businessId: businessId || null,
    });
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
      aria-labelledby="activity-form-heading"
      onSubmit={submit}
    >
      <h2 id="activity-form-heading">
        {activity ? "Edit activity" : "Add activity"}
      </h2>
      <fieldset disabled={save.isPending}>
        <div className="form-fields">
          <label>
            Activity name
            <input
              name="name"
              type="text"
              required
              maxLength={recordNameMaxLength}
              defaultValue={activity?.name}
              autoFocus={!!activity}
            />
          </label>
          <label>
            Start date
            <input
              name="startDate"
              type="date"
              required
              defaultValue={activity?.startDate}
            />
          </label>
          <label>
            Business (optional)
            <select
              value={businessId}
              onChange={(event) => setBusinessId(event.currentTarget.value)}
            >
              <option value="">No linked business</option>
              {outsideChoices && (
                <option value={outsideChoices.id}>
                  {outsideChoices.name}
                  {outsideChoices.archivedAt
                    ? " (archived)"
                    : " (current link)"}
                </option>
              )}
              {activeBusinesses?.map((business) => (
                <option key={business.id} value={business.id}>
                  {business.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        {businesses.isPending && (
          <p role="status">Loading available businesses…</p>
        )}
        {businesses.isError && (
          <div className="page-actions">
            <p role="alert">Could not load available businesses.</p>
            <button
              type="button"
              onClick={() => void businesses.refetch({ cancelRefetch: false })}
            >
              Retry
            </button>
          </div>
        )}
        {(validation || save.error) && (
          <p role="alert">{validation || save.error?.message}</p>
        )}
        <div className="page-actions">
          <button className="primary-button" type="submit">
            {save.isPending ? "Saving…" : "Save activity"}
          </button>
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </fieldset>
    </form>
  );
}

export function Activities() {
  const { data: status } = useRecordStatus();
  if (!status) return <Navigate to={path} replace />;
  return <ActivitiesView status={status} />;
}

function ActivitiesView({ status }: { status: RecordStatus }) {
  const client = useQueryClient();
  const [editor, setEditor] = useState<Activity | "new" | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [saved, setSaved] = useState("");
  const query = useQuery({
    ...recordListCacheOptions,
    queryKey: activitiesQueryKey,
    queryFn: ({ signal }) => fetchActivities(signal),
  });
  const visibleActivities = filterRecordsByStatus(query.data, status);
  const { mutate, reset, isPending, error } = useMutation({
    mutationFn: ({ id, archived }: { id: string; archived: boolean }) =>
      saveActivity({ archived }, id),
    onSuccess: () => client.invalidateQueries({ queryKey: activitiesQueryKey }),
  });

  useLayoutEffect(() => {
    setEditor(null);
    setConfirming(null);
    setSaved("");
    reset();
  }, [status, reset]);

  function openEditor(activity: Activity | "new") {
    setConfirming(null);
    setSaved("");
    reset();
    setEditor(activity);
  }

  function setArchived(id: string, archived: boolean) {
    setSaved("");
    mutate(
      { id, archived },
      {
        onSuccess: (activity) => {
          setConfirming(null);
          setSaved(`${activity.name} ${archived ? "archived" : "restored"}.`);
        },
      },
    );
  }

  const actionsDisabled = !!editor || !!confirming || isPending;

  return (
    <main>
      <PageHeader
        title="Activities"
        description="Activity start dates and business links."
        actions={
          <>
            <RecordRefreshButton
              onRefresh={() => void query.refetch({ cancelRefetch: false })}
            />
            <button
              className="primary-button record-add-button"
              data-reserve-space={status === "archived" || !!editor}
              disabled={isPending}
              onClick={() => openEditor("new")}
            >
              <Plus aria-hidden="true" size={16} /> Add activity
            </button>
          </>
        }
      />
      <RecordStatusNav path={path} status={status} label="Activity status" />
      <section aria-label="Activity results">
        <RecordLoadingStatus
          records="activities"
          isFetching={query.isFetching}
          isPending={query.isPending}
        />
        {editor && (
          <ActivityForm
            key={editor === "new" ? "new" : editor.id}
            activity={editor === "new" ? undefined : editor}
            onCancel={() => setEditor(null)}
            onSaved={(activity) => {
              setEditor(null);
              setSaved(
                `${activity.name} ${editor === "new" ? "added" : "updated"}.`,
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
        {visibleActivities?.length === 0 && <p>{emptyMessage[status]}</p>}
        {!!visibleActivities?.length && (
          <ul
            className="record-grid"
            aria-label={`${statusLabels[status]} activities`}
          >
            {visibleActivities.map((activity) => (
              <li key={activity.id}>
                <div className="account-heading">
                  <div className="account-icon">
                    <ListChecks aria-hidden="true" size={20} />
                  </div>
                  {status === "all" && activity.archivedAt && (
                    <span className="account-archived-label">
                      {statusLabels.archived}
                    </span>
                  )}
                </div>
                <h2>{activity.name}</h2>
                <p className="date">
                  Started{" "}
                  <time dateTime={activity.startDate}>
                    {dateFormat.format(new Date(activity.startDate))}
                  </time>
                </p>
                <div className="record-card-detail date wrap-anywhere">
                  {activity.business && (
                    <>
                      Business: {activity.business.name}
                      {activity.business.archivedAt && " (archived)"}
                    </>
                  )}
                </div>
                <div className="account-card-actions">
                  {confirming === activity.id ? (
                    <ArchiveConfirmation
                      name={activity.name}
                      record="activity"
                      pending={isPending}
                      onConfirm={() => setArchived(activity.id, true)}
                      onCancel={() => {
                        setConfirming(null);
                        reset();
                      }}
                    />
                  ) : (
                    <div className="page-actions">
                      {activity.archivedAt ? (
                        <RecordAction
                          action="Restore"
                          name={activity.name}
                          disabled={actionsDisabled}
                          onClick={() => setArchived(activity.id, false)}
                        />
                      ) : (
                        <>
                          <RecordAction
                            action="Edit"
                            name={activity.name}
                            disabled={actionsDisabled}
                            onClick={() => openEditor(activity)}
                          />
                          <RecordAction
                            action="Archive"
                            name={activity.name}
                            disabled={actionsDisabled}
                            onClick={() => {
                              setSaved("");
                              reset();
                              setConfirming(activity.id);
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
