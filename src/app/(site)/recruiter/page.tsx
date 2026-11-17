import type { Metadata } from "next";
import Link from "next/link";
import { Eye, FileText, Percent, Plus, Radio } from "lucide-react";
import { StatTile, StatusBreakdown } from "@/components/analytics";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { ApplicationStatusBadge, JobStatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db } from "@/lib/db";
import { statusCounts } from "@/lib/recruiter";
import { requireRecruiterCompany } from "@/lib/session";
import { conversionRate, timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Recruiter dashboard" };

export default async function RecruiterDashboard() {
  const user = await requireRecruiterCompany("/recruiter");
  const [company, jobs, counts, recent] = await Promise.all([
    db.company.findUniqueOrThrow({ where: { id: user.companyId }, select: { name: true } }),
    db.job.findMany({
      where: { companyId: user.companyId },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, status: true, views: true, _count: { select: { applications: true } } },
    }),
    statusCounts({ companyId: user.companyId }),
    db.application.findMany({
      where: { job: { companyId: user.companyId } },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, fullName: true, status: true, createdAt: true, job: { select: { title: true } } },
    }),
  ]);

  const views = jobs.reduce((s, j) => s + j.views, 0);
  const applications = jobs.reduce((s, j) => s + j._count.applications, 0);
  const live = jobs.filter((j) => j.status === "PUBLISHED").length;

  return (
    <>
      <PageHeader title={`${company.name} dashboard`} description="How your roles are performing, at a glance.">
        <Button asChild>
          <Link href="/recruiter/jobs/new">
            <Plus /> Post a job
          </Link>
        </Button>
      </PageHeader>

      {jobs.length === 0 ? (
        <EmptyState icon={FileText} title="Post your first job" description="Start from a template and publish a polished role in minutes.">
          <Button asChild>
            <Link href="/recruiter/jobs/new">Post a job</Link>
          </Button>
        </EmptyState>
      ) : (
        <div className="space-y-10">
          <dl className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <StatTile icon={Radio} label="Live jobs" value={String(live)} hint={`${jobs.length} total`} />
            <StatTile icon={Eye} label="Views" value={views.toLocaleString("en-US")} />
            <StatTile icon={FileText} label="Applications" value={applications.toLocaleString("en-US")} />
            <StatTile icon={Percent} label="Conversion rate" value={`${conversionRate(applications, views)}%`} hint="Applications ÷ views" />
          </dl>

          <div className="grid gap-6 xl:grid-cols-2">
            <section aria-labelledby="breakdown-heading" className="rounded-2xl border bg-card p-5 sm:p-6">
              <h2 id="breakdown-heading" className="mb-5 font-semibold">
                Applications by status
              </h2>
              <StatusBreakdown counts={counts} />
            </section>
            <section aria-labelledby="recent-heading" className="rounded-2xl border bg-card p-5 sm:p-6">
              <h2 id="recent-heading" className="mb-4 font-semibold">
                Recent applications
              </h2>
              {recent.length === 0 ? (
                <p className="text-sm text-muted-foreground">No applications yet.</p>
              ) : (
                <ul className="divide-y">
                  {recent.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <Link href={`/recruiter/applications/${a.id}`} className="block truncate font-medium underline-offset-4 hover:underline">
                          {a.fullName}
                        </Link>
                        <p className="truncate text-sm text-muted-foreground">
                          {a.job.title} · {timeAgo(a.createdAt)}
                        </p>
                      </div>
                      <ApplicationStatusBadge status={a.status} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <section aria-labelledby="performance-heading">
            <h2 id="performance-heading" className="mb-4 font-semibold">
              Performance by job
            </h2>
            <div className="overflow-x-auto rounded-2xl border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Views</TableHead>
                    <TableHead className="text-right">Applications</TableHead>
                    <TableHead className="text-right">Conversion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((j) => (
                    <TableRow key={j.id}>
                      <TableCell className="max-w-56 truncate font-medium">
                        <Link href={`/recruiter/jobs/${j.id}/applications`} className="underline-offset-4 hover:underline">
                          {j.title}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <JobStatusBadge status={j.status} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{j.views.toLocaleString("en-US")}</TableCell>
                      <TableCell className="text-right tabular-nums">{j._count.applications}</TableCell>
                      <TableCell className="text-right tabular-nums">{conversionRate(j._count.applications, j.views)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
