import type { LucideIcon } from "lucide-react";
import { APPLICATION_STATUSES, APPLICATION_STATUS_LABELS, type ApplicationStatusValue } from "@/lib/constants";

export function StatTile({ label, value, hint, icon: Icon }: { label: string; value: string; hint?: string; icon?: LucideIcon }) {
  return (
    <div className="rounded-2xl border bg-card p-4 sm:p-5">
      <dt className="flex items-center gap-2 text-sm text-muted-foreground">
        {Icon && <Icon className="size-4" />}
        {label}
      </dt>
      <dd className="mt-2 text-2xl font-semibold tabular-nums sm:text-3xl">{value}</dd>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Horizontal bars, one per application status, with counts written out so no value depends on colour alone. */
export function StatusBreakdown({ counts }: { counts: Partial<Record<ApplicationStatusValue, number>> }) {
  const total = APPLICATION_STATUSES.reduce((sum, s) => sum + (counts[s] ?? 0), 0);
  const max = Math.max(1, ...APPLICATION_STATUSES.map((s) => counts[s] ?? 0));
  if (total === 0) return <p className="text-sm text-muted-foreground">No applications yet.</p>;
  return (
    <dl className="space-y-3">
      {APPLICATION_STATUSES.map((status) => {
        const count = counts[status] ?? 0;
        return (
          <div key={status} className="grid grid-cols-[7.5rem_1fr_4.5rem] items-center gap-3 text-sm">
            <dt className="truncate text-muted-foreground">{APPLICATION_STATUS_LABELS[status]}</dt>
            <dd className="contents">
              <span className="h-2.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                <span className="block h-full rounded-full bg-primary" style={{ width: `${(count / max) * 100}%` }} />
              </span>
              <span className="text-right font-medium tabular-nums">
                {count} <span className="font-normal text-muted-foreground">({Math.round((count / total) * 100)}%)</span>
              </span>
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
