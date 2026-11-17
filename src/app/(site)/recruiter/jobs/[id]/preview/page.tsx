import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Eye } from "lucide-react";
import { JobDetailBody, JobDetailHeader } from "@/components/jobs/job-detail";
import { JobStatusActions } from "@/components/recruiter/job-status-actions";
import { JobStatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { getCompanyJob } from "@/lib/recruiter";
import { requireRecruiterCompany } from "@/lib/session";

export const metadata: Metadata = { title: "Preview job" };

export default async function PreviewJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireRecruiterCompany(`/recruiter/jobs/${id}/preview`);
  const job = await getCompanyJob(id, user.companyId);
  return (
    <>
      <Link href="/recruiter/jobs" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All jobs
      </Link>
      <div className="mb-8 flex flex-col gap-4 rounded-2xl border border-primary/30 bg-accent/50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 text-sm font-medium">
          <Eye className="size-4 text-primary" />
          {job.status === "DRAFT" ? "Preview — this is how candidates will see your job." : "This is how candidates see your job."}
          <JobStatusBadge status={job.status} />
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/recruiter/jobs/${job.id}/edit`}>Edit</Link>
          </Button>
          {job.status === "PUBLISHED" && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/jobs/${job.slug}`}>Open public page</Link>
            </Button>
          )}
          <JobStatusActions jobId={job.id} status={job.status} canDelete={false} />
        </div>
      </div>
      <div className="space-y-10">
        <JobDetailHeader job={job} />
        <JobDetailBody job={job} />
        {job.screeningQuestions.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold">Screening questions</h2>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-[0.95rem] text-foreground/85">
              {job.screeningQuestions.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ol>
          </section>
        )}
      </div>
    </>
  );
}
