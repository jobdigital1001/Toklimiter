import type { Metadata } from "next";
import Link from "next/link";
import { Briefcase, Plus } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { JobStatusActions } from "@/components/recruiter/job-status-actions";
import { JobStatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { requireRecruiterCompany } from "@/lib/session";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Your jobs" };

export default async function RecruiterJobsPage() {
  const user = await requireRecruiterCompany("/recruiter/jobs");
  const jobs = await db.job.findMany({
    where: { companyId: user.companyId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      status: true,
      location: true,
      views: true,
      deadline: true,
      updatedAt: true,
      _count: { select: { applications: true } },
    },
  });
  return (
    <>
      <PageHeader title="Jobs" description="Create, publish, pause, and close your roles.">
        <Button asChild>
          <Link href="/recruiter/jobs/new">
            <Plus /> New job
          </Link>
        </Button>
      </PageHeader>
      {jobs.length === 0 ? (
        <EmptyState icon={Briefcase} title="No jobs yet" description="Pick a template to draft your first role.">
          <Button asChild>
            <Link href="/recruiter/jobs/new">Create a job</Link>
          </Button>
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {jobs.map((job) => (
            <li key={job.id} className="rounded-2xl border bg-card p-4 sm:p-5" data-testid="recruiter-job">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="flex flex-wrap items-center gap-2 font-semibold">
                    <span className="truncate">{job.title}</span>
                    <JobStatusBadge status={job.status} />
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {job.location} · {job.views.toLocaleString("en-US")} views · {job._count.applications}{" "}
                    {job._count.applications === 1 ? "application" : "applications"}
                    {job.deadline && ` · Apply by ${formatDate(job.deadline)}`}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/recruiter/jobs/${job.id}/applications`}>Applications</Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/recruiter/jobs/${job.id}/edit`}>Edit</Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/recruiter/jobs/${job.id}/preview`}>Preview</Link>
                </Button>
                <span className="mx-1 hidden h-5 w-px bg-border sm:block" aria-hidden="true" />
                <JobStatusActions jobId={job.id} status={job.status} canDelete={job.status === "DRAFT" || job._count.applications === 0} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
