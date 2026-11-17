import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { adminCloseJobAction, resolveReportAction } from "@/actions/admin";
import { ActionButton, ConfirmActionButton } from "@/components/action-buttons";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { JobStatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { cn, timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Reports" };

export default async function AdminReportsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  await requireRole("ADMIN", "/admin/reports");
  const showAll = (await searchParams).view === "all";
  const reports = await db.report.findMany({
    where: showAll ? {} : { status: "OPEN" },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      job: { select: { id: true, slug: true, title: true, status: true, company: { select: { name: true } } } },
      reporter: { select: { email: true } },
    },
  });
  const tab = (active: boolean) =>
    cn("rounded-full border px-3 py-1.5 text-sm", active ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent");
  return (
    <>
      <PageHeader title="Reports" description="Jobs flagged by users for review." />
      <nav aria-label="Report view" className="mb-5 flex gap-2">
        <Link href="/admin/reports" className={tab(!showAll)}>
          Open
        </Link>
        <Link href="/admin/reports?view=all" className={tab(showAll)}>
          All
        </Link>
      </nav>
      {reports.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="Nothing to review" description="There are no open reports right now." />
      ) : (
        <ul className="space-y-3">
          {reports.map((r) => (
            <li key={r.id} className="rounded-2xl border bg-card p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={r.status === "OPEN" ? "destructive" : "secondary"}>{r.status === "OPEN" ? "Open" : r.status === "RESOLVED" ? "Resolved" : "Dismissed"}</Badge>
                <span className="font-medium">{r.reason}</span>
                <span className="text-sm text-muted-foreground">· {timeAgo(r.createdAt)}</span>
              </div>
              <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                {r.job.status === "PUBLISHED" ? (
                  <Link href={`/jobs/${r.job.slug}`} className="font-medium underline-offset-4 hover:underline">
                    {r.job.title}
                  </Link>
                ) : (
                  <span className="font-medium">{r.job.title}</span>
                )}
                <span className="text-muted-foreground">at {r.job.company.name}</span>
                <JobStatusBadge status={r.job.status} />
              </p>
              {r.details && <p className="mt-2 rounded-lg bg-muted/60 p-3 text-sm whitespace-pre-line">{r.details}</p>}
              <p className="mt-2 text-xs text-muted-foreground">Reported by {r.reporter?.email ?? "a deleted user"}</p>
              {r.status === "OPEN" && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {(r.job.status === "PUBLISHED" || r.job.status === "PAUSED") && (
                    <ConfirmActionButton
                      size="sm"
                      variant="destructive"
                      action={async () => {
                        "use server";
                        const closed = await adminCloseJobAction(r.job.id);
                        return closed.ok ? resolveReportAction(r.id, "RESOLVED") : closed;
                      }}
                      title="Close this job and resolve the report?"
                      description="The job will be removed from the public site."
                      confirmLabel="Close job"
                    >
                      Close job
                    </ConfirmActionButton>
                  )}
                  <ActionButton size="sm" variant="outline" action={resolveReportAction.bind(null, r.id, "RESOLVED")}>
                    Mark resolved
                  </ActionButton>
                  <ActionButton size="sm" variant="ghost" action={resolveReportAction.bind(null, r.id, "DISMISSED")}>
                    Dismiss
                  </ActionButton>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
