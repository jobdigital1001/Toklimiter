import type { ApplicationStatusValue, JobStatusValue } from "@/lib/constants";

export type JobAction = "publish" | "pause" | "unpause" | "close" | "reopen";

const TRANSITIONS: Record<JobAction, { from: JobStatusValue[]; to: JobStatusValue }> = {
  publish: { from: ["DRAFT"], to: "PUBLISHED" },
  pause: { from: ["PUBLISHED"], to: "PAUSED" },
  unpause: { from: ["PAUSED"], to: "PUBLISHED" },
  close: { from: ["PUBLISHED", "PAUSED"], to: "CLOSED" },
  reopen: { from: ["CLOSED"], to: "PUBLISHED" },
};

export function nextJobStatus(current: JobStatusValue, action: JobAction): JobStatusValue | null {
  const t = TRANSITIONS[action];
  return t && t.from.includes(current) ? t.to : null;
}

export function availableJobActions(current: JobStatusValue): JobAction[] {
  return (Object.keys(TRANSITIONS) as JobAction[]).filter((a) => TRANSITIONS[a].from.includes(current));
}

/** A job accepts applications only while published and before its deadline (inclusive of the deadline day). */
export function isJobOpen(job: { status: JobStatusValue; deadline: Date | null }, now: Date = new Date()): boolean {
  if (job.status !== "PUBLISHED") return false;
  if (!job.deadline) return true;
  const end = new Date(job.deadline);
  end.setUTCHours(23, 59, 59, 999);
  return end.getTime() >= now.getTime();
}

/** Recruiters can move an application anywhere except to/from WITHDRAWN, which only the candidate controls. */
export function canRecruiterSetStatus(current: ApplicationStatusValue, next: ApplicationStatusValue): boolean {
  if (current === "WITHDRAWN" || next === "WITHDRAWN") return false;
  return current !== next;
}

export function canCandidateWithdraw(current: ApplicationStatusValue): boolean {
  return current === "SUBMITTED" || current === "UNDER_REVIEW" || current === "INTERVIEW";
}
