import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { JobForm } from "@/components/recruiter/job-form";
import { JobStatusBadge } from "@/components/status-badge";
import { db } from "@/lib/db";
import { getCompanyJob } from "@/lib/recruiter";
import { requireRecruiterCompany } from "@/lib/session";

export const metadata: Metadata = { title: "Edit job" };

export default async function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireRecruiterCompany(`/recruiter/jobs/${id}/edit`);
  const [job, categories] = await Promise.all([
    getCompanyJob(id, user.companyId),
    db.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return (
    <>
      <Link href="/recruiter/jobs" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All jobs
      </Link>
      <PageHeader title="Edit job">
        <JobStatusBadge status={job.status} className="self-center" />
      </PageHeader>
      <JobForm
        jobId={job.id}
        isDraft={job.status === "DRAFT"}
        categories={categories}
        defaults={{
          title: job.title,
          categoryId: job.categoryId,
          location: job.location,
          arrangement: job.arrangement,
          employmentType: job.employmentType,
          experienceLevel: job.experienceLevel,
          salaryMin: job.salaryMin,
          salaryMax: job.salaryMax,
          currency: job.currency as "USD",
          description: job.description,
          responsibilities: job.responsibilities,
          requirements: job.requirements,
          benefits: job.benefits,
          skills: job.skills,
          screeningQuestions: job.screeningQuestions,
          deadline: job.deadline ? job.deadline.toISOString().slice(0, 10) : "",
        }}
      />
    </>
  );
}
