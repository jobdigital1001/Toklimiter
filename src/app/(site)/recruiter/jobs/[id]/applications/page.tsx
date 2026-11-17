import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Download, Eye, FileText, Inbox, Percent } from "lucide-react";
import { StatTile, StatusBreakdown } from "@/components/analytics";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { ApplicationStatusBadge, JobStatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { APPLICATION_STATUSES, APPLICATION_STATUS_LABELS, type ApplicationStatusValue } from "@/lib/constants";
import { db } from "@/lib/db";
import { getCompanyJob, statusCounts } from "@/lib/recruiter";
import { requireRecruiterCompany } from "@/lib/session";
import { cn, conversionRate, timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Applications" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ status?: string }> };

export default async function JobApplicationsPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { status: rawStatus } = await searchParams;
  const user = await requireRecruiterCompany(`/recruiter/jobs/${id}/applications`);
  const job = await getCompanyJob(id, user.companyId);
  const status = (APPLICATION_STATUSES as readonly string[]).includes(rawStatus ?? "") ? (rawStatus as ApplicationStatusValue) : null;

  const [applications, counts] = await Promise.all([
    db.application.findMany({
      where: { jobId: job.id, ...(status ? { status } : {}) },
      orderBy: { createdAt: "desc" },
      select: { id: true, fullName: true, email: true, status: true, createdAt: true, cvKey: true, _count: { select: { notes: true } } },
    }),
    statusCounts({ jobId: job.id }),
  ]);
  const total = job._count.applications;
  const base = `/recruiter/jobs/${job.id}/applications`;
  const chip = (active: boolean) =>
    cn(
      "rounded-full border px-3 py-1.5 text-sm whitespace-nowrap transition-colors",
      active ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent",
    );

  return (
    <>
      <Link href="/recruiter/jobs" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All jobs
      </Link>
      <PageHeader title={job.title} description="Applications and performance for this role.">
        <JobStatusBadge status={job.status} className="self-center" />
        <Button asChild variant="outline" size="sm">
          <Link href={`/recruiter/jobs/${job.id}/edit`}>Edit job</Link>
        </Button>
      </PageHeader>

      <div className="grid gap-4 xl:grid-cols-[1fr_1.2fr]">
        <dl className="grid grid-cols-3 gap-3 xl:grid-cols-1">
          <StatTile icon={Eye} label="Views" value={job.views.toLocaleString("en-US")} />
          <StatTile icon={FileText} label="Applications" value={String(total)} />
          <StatTile icon={Percent} label="Conversion" value={`${conversionRate(total, job.views)}%`} />
        </dl>
        <section aria-labelledby="status-heading" className="rounded-2xl border bg-card p-5 sm:p-6">
          <h2 id="status-heading" className="mb-5 font-semibold">
            Status breakdown
          </h2>
          <StatusBreakdown counts={counts} />
        </section>
      </div>

      <section aria-labelledby="applicants-heading" className="mt-10">
        <h2 id="applicants-heading" className="mb-4 font-semibold">
          Applicants
        </h2>
        <nav aria-label="Filter by status" className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          <Link href={base} className={chip(!status)} aria-current={!status ? "true" : undefined}>
            All ({total})
          </Link>
          {APPLICATION_STATUSES.map((s) => (
            <Link key={s} href={`${base}?status=${s}`} className={chip(status === s)} aria-current={status === s ? "true" : undefined}>
              {APPLICATION_STATUS_LABELS[s]} ({counts[s] ?? 0})
            </Link>
          ))}
        </nav>

        {applications.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title={status ? "No applications with this status" : "No applications yet"}
            description={status ? "Try a different status filter." : "Applications will appear here as candidates apply."}
          />
        ) : (
          <ul className="space-y-3">
            {applications.map((a) => (
              <li key={a.id} className="flex flex-col gap-3 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:p-5">
                <div className="min-w-0 flex-1">
                  <Link href={`/recruiter/applications/${a.id}`} className="font-semibold underline-offset-4 hover:underline">
                    {a.fullName}
                  </Link>
                  <p className="truncate text-sm text-muted-foreground">
                    {a.email} · Applied {timeAgo(a.createdAt)}
                    {a._count.notes > 0 && ` · ${a._count.notes} note${a._count.notes === 1 ? "" : "s"}`}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <ApplicationStatusBadge status={a.status} />
                  {a.cvKey && (
                    <Button asChild variant="ghost" size="sm">
                      <a href={`/api/cv/application/${a.id}`} download>
                        <Download /> CV
                      </a>
                    </Button>
                  )}
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/recruiter/applications/${a.id}`}>Review</Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
