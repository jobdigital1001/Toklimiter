import type { Metadata } from "next";
import Link from "next/link";
import { Briefcase, Building2, FileText, Flag, Mail, Users } from "lucide-react";
import { StatTile, StatusBreakdown } from "@/components/analytics";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import type { ApplicationStatusValue } from "@/lib/constants";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { daysAgo, timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Admin overview" };

export default async function AdminOverview() {
  await requireRole("ADMIN", "/admin");
  const weekAgo = daysAgo(7);
  const [users, newUsers, companies, liveJobs, applications, openReports, subscribers, byStatus, recentUsers] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { createdAt: { gte: weekAgo } } }),
    db.company.count(),
    db.job.count({ where: { status: "PUBLISHED" } }),
    db.application.count(),
    db.report.count({ where: { status: "OPEN" } }),
    db.newsletterSubscriber.count(),
    db.application.groupBy({ by: ["status"], _count: { _all: true } }),
    db.user.findMany({ orderBy: { createdAt: "desc" }, take: 6, select: { id: true, name: true, email: true, role: true, createdAt: true } }),
  ]);
  const counts: Partial<Record<ApplicationStatusValue, number>> = {};
  for (const row of byStatus) counts[row.status] = row._count._all;

  return (
    <>
      <PageHeader title="Platform overview" description="Activity across Genius JobPortal." />
      <dl className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
        <StatTile icon={Users} label="Users" value={users.toLocaleString("en-US")} hint={`${newUsers} new this week`} />
        <StatTile icon={Building2} label="Companies" value={companies.toLocaleString("en-US")} />
        <StatTile icon={Briefcase} label="Live jobs" value={liveJobs.toLocaleString("en-US")} />
        <StatTile icon={FileText} label="Applications" value={applications.toLocaleString("en-US")} />
        <StatTile icon={Flag} label="Open reports" value={String(openReports)} />
        <StatTile icon={Mail} label="Newsletter subscribers" value={subscribers.toLocaleString("en-US")} />
      </dl>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <section aria-labelledby="pipeline-heading" className="rounded-2xl border bg-card p-5 sm:p-6">
          <h2 id="pipeline-heading" className="mb-5 font-semibold">
            Applications by status
          </h2>
          <StatusBreakdown counts={counts} />
        </section>
        <section aria-labelledby="signups-heading" className="rounded-2xl border bg-card p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 id="signups-heading" className="font-semibold">
              Newest users
            </h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/users">View all</Link>
            </Button>
          </div>
          <ul className="divide-y">
            {recentUsers.map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-3 py-2.5 text-sm first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate font-medium">{u.name ?? u.email}</p>
                  <p className="truncate text-muted-foreground">{u.email}</p>
                </div>
                <p className="shrink-0 text-right text-xs text-muted-foreground">
                  {u.role.toLowerCase()}
                  <br />
                  {timeAgo(u.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
