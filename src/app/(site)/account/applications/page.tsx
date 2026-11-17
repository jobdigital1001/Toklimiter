import type { Metadata } from "next";
import Link from "next/link";
import { FileCheck2 } from "lucide-react";
import { withdrawApplicationAction } from "@/actions/candidate";
import { ConfirmActionButton } from "@/components/action-buttons";
import { CompanyLogo } from "@/components/company-logo";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { ApplicationStatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { canCandidateWithdraw } from "@/lib/job-status";
import { requireRole } from "@/lib/session";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Applications" };

export default async function ApplicationsPage() {
  const user = await requireRole("CANDIDATE", "/account/applications");
  const applications = await db.application.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      job: { select: { title: true, slug: true, status: true, location: true, company: { select: { name: true, logoUrl: true } } } },
    },
  });

  return (
    <>
      <PageHeader title="Applications" description="Track the status of every role you’ve applied to." />
      {applications.length === 0 ? (
        <EmptyState icon={FileCheck2} title="No applications yet" description="When you apply to a job, you’ll be able to follow its progress here.">
          <Button asChild>
            <Link href="/jobs">Find a role</Link>
          </Button>
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {applications.map((a) => (
            <li key={a.id} className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:p-5">
              <div className="flex min-w-0 flex-1 items-center gap-3.5">
                <CompanyLogo name={a.job.company.name} logoUrl={a.job.company.logoUrl} />
                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    {a.job.status === "DRAFT" ? (
                      a.job.title
                    ) : (
                      <Link href={`/jobs/${a.job.slug}`} className="underline-offset-4 hover:underline">
                        {a.job.title}
                      </Link>
                    )}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {a.job.company.name} · {a.job.location}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Applied {formatDate(a.createdAt)}
                    {a.updatedAt.getTime() - a.createdAt.getTime() > 60_000 && ` · Updated ${formatDate(a.updatedAt)}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 sm:justify-end">
                <ApplicationStatusBadge status={a.status} />
                {canCandidateWithdraw(a.status) && (
                  <ConfirmActionButton
                    variant="ghost"
                    size="sm"
                    action={withdrawApplicationAction.bind(null, a.id)}
                    title="Withdraw this application?"
                    description={`${a.job.company.name} will see that you withdrew. You won’t be able to re-apply to this role.`}
                    confirmLabel="Withdraw"
                  >
                    Withdraw
                  </ConfirmActionButton>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
