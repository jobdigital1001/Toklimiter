"use client";

import { changeJobStatusAction, deleteJobAction } from "@/actions/recruiter";
import { ActionButton, ConfirmActionButton } from "@/components/action-buttons";
import type { JobStatusValue } from "@/lib/constants";
import { availableJobActions, type JobAction } from "@/lib/job-status";

const LABELS: Record<JobAction, string> = {
  publish: "Publish",
  pause: "Pause",
  unpause: "Unpause",
  close: "Close",
  reopen: "Reopen",
};

export function JobStatusActions({
  jobId,
  status,
  canDelete,
  size = "sm",
}: {
  jobId: string;
  status: JobStatusValue;
  canDelete: boolean;
  size?: "sm" | "default" | "lg";
}) {
  const actions = availableJobActions(status);
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) =>
        action === "close" ? (
          <ConfirmActionButton
            key={action}
            size={size}
            variant="outline"
            action={() => changeJobStatusAction(jobId, action)}
            title="Close this job?"
            description="It will be removed from search and stop accepting applications. You can reopen it later."
            confirmLabel="Close job"
          >
            {LABELS[action]}
          </ConfirmActionButton>
        ) : (
          <ActionButton
            key={action}
            size={size}
            variant={action === "publish" || action === "unpause" || action === "reopen" ? "default" : "outline"}
            action={() => changeJobStatusAction(jobId, action)}
          >
            {LABELS[action]}
          </ActionButton>
        ),
      )}
      {canDelete && (
        <ConfirmActionButton
          size={size}
          variant="ghost"
          className="text-destructive"
          action={() => deleteJobAction(jobId)}
          redirectTo="/recruiter/jobs"
          title="Delete this job?"
          description="This permanently deletes the job. This can’t be undone."
          confirmLabel="Delete"
        >
          Delete
        </ConfirmActionButton>
      )}
    </div>
  );
}
