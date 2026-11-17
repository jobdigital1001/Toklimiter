import { Badge } from "@/components/ui/badge";
import {
  APPLICATION_STATUS_LABELS,
  JOB_STATUS_LABELS,
  type ApplicationStatusValue,
  type JobStatusValue,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

const APPLICATION_TONES: Record<ApplicationStatusValue, string> = {
  SUBMITTED: "bg-secondary text-secondary-foreground",
  UNDER_REVIEW: "bg-sky-100 text-sky-900 dark:bg-sky-500/20 dark:text-sky-200",
  INTERVIEW: "bg-violet-100 text-violet-900 dark:bg-violet-500/20 dark:text-violet-200",
  OFFER: "bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-200",
  REJECTED: "bg-rose-100 text-rose-900 dark:bg-rose-500/20 dark:text-rose-200",
  WITHDRAWN: "bg-muted text-muted-foreground",
};

const JOB_TONES: Record<JobStatusValue, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  PUBLISHED: "bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-200",
  PAUSED: "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200",
  CLOSED: "bg-rose-100 text-rose-900 dark:bg-rose-500/20 dark:text-rose-200",
};

export function ApplicationStatusBadge({ status, className }: { status: ApplicationStatusValue; className?: string }) {
  return (
    <Badge variant="secondary" className={cn("border-transparent", APPLICATION_TONES[status], className)}>
      {APPLICATION_STATUS_LABELS[status]}
    </Badge>
  );
}

export function JobStatusBadge({ status, className }: { status: JobStatusValue; className?: string }) {
  return (
    <Badge variant="secondary" className={cn("border-transparent", JOB_TONES[status], className)}>
      {JOB_STATUS_LABELS[status]}
    </Badge>
  );
}
