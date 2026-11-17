import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Lock } from "lucide-react";
import { CompanyLogo } from "@/components/company-logo";
import { JobCard } from "@/components/job-card";
import { ApplyForm } from "@/components/jobs/apply-form";
import { JobDetailBody, JobDetailHeader } from "@/components/jobs/job-detail";
import { ReportJobButton } from "@/components/jobs/report-job-button";
import { ShareButtons } from "@/components/jobs/share-buttons";
import { ViewTracker } from "@/components/jobs/view-tracker";
import { SaveJobButton } from "@/components/save-job-button";
import { ApplicationStatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { isJobOpen } from "@/lib/job-status";
import { getSavedJobIds, getSimilarJobs, jobCardInclude, publicJobWhere } from "@/lib/jobs";
import { getCurrentUser } from "@/lib/session";
import { appUrl, formatDate } from "@/lib/utils";

type Props = { params: Promise<{ slug: string }> };

const getJob = cache(async (slug: string) =>
  db.job.findFirst({
    where: { AND: [{ slug }, publicJobWhere()] },
    include: {
      ...jobCardInclude,
      company: {
        select: { name: true, slug: true, logoUrl: true, verified: true, tagline: true, industry: true, size: true, location: true, website: true },
      },
    },
  }),
);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const job = await getJob((await params).slug);
  if (!job) return { title: "Job not found" };
  const description = `${job.title} at ${job.company.name} — ${job.location}. ${job.description.slice(0, 140)}`;
  return {
    title: `${job.title} at ${job.company.name}`,
    description,
    alternates: { canonical: `/jobs/${job.slug}` },
    openGraph: { title: `${job.title} at ${job.company.name}`, description, type: "article" },
  };
}

export default async function JobPage({ params }: Props) {
  const { slug } = await params;
  const job = await getJob(slug);
  if (!job) notFound();

  const user = await getCurrentUser();
  const isCandidate = user?.role === "CANDIDATE";
  const [similar, application, profile, savedIds] = await Promise.all([
    getSimilarJobs(job),
    isCandidate
      ? db.application.findUnique({ where: { jobId_userId: { jobId: job.id, userId: user.id } }, select: { status: true, createdAt: true } })
      : null,
    isCandidate
      ? db.candidateProfile.findUnique({
          where: { userId: user.id },
          select: { phone: true, linkedinUrl: true, portfolioUrl: true, githubUrl: true, cvKey: true, cvFileName: true },
        })
      : null,
    getSavedJobIds(isCandidate ? user.id : undefined, [job.id]),
  ]);
  const similarSaved = await getSavedJobIds(isCandidate ? user.id : undefined, similar.map((j) => j.id));
  const viewer = { signedIn: Boolean(user), canSave: isCandidate };
  const open = isJobOpen(job);
  const url = appUrl(`/jobs/${job.slug}`);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: job.description,
    datePosted: (job.publishedAt ?? job.createdAt).toISOString(),
    ...(job.deadline ? { validThrough: job.deadline.toISOString() } : {}),
    employmentType: job.employmentType,
    hiringOrganization: { "@type": "Organization", name: job.company.name, ...(job.company.website ? { sameAs: job.company.website } : {}) },
    jobLocation: { "@type": "Place", address: job.location },
    ...(job.arrangement === "REMOTE" ? { jobLocationType: "TELECOMMUTE" } : {}),
    ...(job.salaryMin || job.salaryMax
      ? {
          baseSalary: {
            "@type": "MonetaryAmount",
            currency: job.currency,
            value: { "@type": "QuantitativeValue", minValue: job.salaryMin ?? undefined, maxValue: job.salaryMax ?? undefined, unitText: "YEAR" },
          },
        }
      : {}),
  };

  return (
    <div className="container-page py-8 pb-28 sm:py-12 lg:pb-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <ViewTracker jobId={job.id} />
      <Link href="/jobs" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All jobs
      </Link>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-10">
          <JobDetailHeader
            job={job}
            actions={
              <>
                {open && !application && (
                  <Button asChild size="lg">
                    <a href="#apply">Apply now</a>
                  </Button>
                )}
                <SaveJobButton jobId={job.id} saved={savedIds.has(job.id)} variant="full" {...viewer} />
              </>
            }
          />
          <JobDetailBody job={job} />

          <section id="apply" aria-labelledby="apply-heading" className="scroll-mt-24 rounded-2xl border bg-card p-5 sm:p-8">
            <h2 id="apply-heading" className="text-xl font-semibold">
              Apply for this role
            </h2>
            {application ? (
              <div className="mt-4 flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />
                <div>
                  <p className="font-medium">You applied on {formatDate(application.createdAt)}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    Current status: <ApplicationStatusBadge status={application.status} />
                  </p>
                  <Button asChild variant="outline" size="sm" className="mt-4">
                    <Link href="/account/applications">Track your applications</Link>
                  </Button>
                </div>
              </div>
            ) : !open ? (
              <p className="mt-3 text-muted-foreground">This job is no longer accepting applications.</p>
            ) : !user ? (
              <div className="mt-3">
                <p className="text-muted-foreground">Sign in or create a free account to apply and track your application.</p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Button asChild>
                    <Link href={`/sign-in?next=${encodeURIComponent(`/jobs/${job.slug}#apply`)}`}>Sign in to apply</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href={`/sign-up?next=${encodeURIComponent(`/jobs/${job.slug}#apply`)}`}>Create account</Link>
                  </Button>
                </div>
              </div>
            ) : !isCandidate ? (
              <p className="mt-3 flex items-center gap-2 text-muted-foreground">
                <Lock className="size-4" /> Only candidate accounts can apply to jobs.
              </p>
            ) : (
              <div className="mt-6">
                <ApplyForm
                  jobId={job.id}
                  companyName={job.company.name}
                  questions={job.screeningQuestions}
                  profileCvName={profile?.cvKey ? (profile.cvFileName ?? "Profile CV") : null}
                  defaults={{
                    fullName: user.name ?? "",
                    email: user.email,
                    phone: profile?.phone ?? "",
                    linkUrl: profile?.linkedinUrl ?? profile?.portfolioUrl ?? profile?.githubUrl ?? "",
                  }}
                />
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <section aria-label="About the company" className="rounded-2xl border bg-card p-5">
            <div className="flex items-center gap-3">
              <CompanyLogo name={job.company.name} logoUrl={job.company.logoUrl} />
              <div className="min-w-0">
                <p className="truncate font-semibold">{job.company.name}</p>
                <p className="truncate text-sm text-muted-foreground">{job.company.industry}</p>
              </div>
            </div>
            {job.company.tagline && <p className="mt-4 text-sm leading-6 text-muted-foreground">{job.company.tagline}</p>}
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Headquarters</dt>
                <dd className="text-right font-medium">{job.company.location}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Company size</dt>
                <dd className="font-medium">{job.company.size} people</dd>
              </div>
            </dl>
            <Button asChild variant="outline" className="mt-5 w-full">
              <Link href={`/companies/${job.company.slug}`}>View company profile</Link>
            </Button>
          </section>
          <section aria-labelledby="share-heading" className="rounded-2xl border bg-card p-5">
            <h2 id="share-heading" className="mb-3 text-sm font-semibold">
              Share this job
            </h2>
            <ShareButtons url={url} title={`${job.title} at ${job.company.name}`} />
          </section>
          {user && <ReportJobButton jobId={job.id} />}
        </aside>
      </div>

      {similar.length > 0 && (
        <section aria-labelledby="similar-heading" className="mt-16">
          <h2 id="similar-heading" className="text-2xl font-semibold">
            Similar jobs
          </h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((j) => (
              <li key={j.id}>
                <JobCard job={j} saved={similarSaved.has(j.id)} viewer={viewer} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {open && !application && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 p-3 backdrop-blur lg:hidden">
          <Button asChild size="lg" className="w-full">
            <a href="#apply">Apply now</a>
          </Button>
        </div>
      )}
    </div>
  );
}
