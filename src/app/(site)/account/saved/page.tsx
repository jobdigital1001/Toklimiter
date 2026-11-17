import type { Metadata } from "next";
import Link from "next/link";
import { Bookmark } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { JobCard } from "@/components/job-card";
import { PageHeader } from "@/components/page-header";
import { JobStatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { isJobOpen } from "@/lib/job-status";
import { jobCardInclude } from "@/lib/jobs";
import { requireRole } from "@/lib/session";

export const metadata: Metadata = { title: "Saved jobs" };

export default async function SavedJobsPage() {
  const user = await requireRole("CANDIDATE", "/account/saved");
  const saved = await db.savedJob.findMany({
    where: { userId: user.id, job: { status: { not: "DRAFT" } } },
    orderBy: { createdAt: "desc" },
    include: { job: { include: jobCardInclude } },
  });
  return (
    <>
      <PageHeader title="Saved jobs" description="Roles you’ve bookmarked to revisit." />
      {saved.length === 0 ? (
        <EmptyState icon={Bookmark} title="No saved jobs yet" description="Tap the bookmark on any job to keep it here for later.">
          <Button asChild>
            <Link href="/jobs">Browse jobs</Link>
          </Button>
        </EmptyState>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {saved.map(({ job }) => (
            <li key={job.id} className="relative">
              <JobCard job={job} saved viewer={{ signedIn: true, canSave: true }} className={isJobOpen(job) ? undefined : "opacity-70"} />
              {!isJobOpen(job) && (
                <JobStatusBadge status={job.status === "PUBLISHED" ? "CLOSED" : job.status} className="absolute right-14 top-5" />
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
