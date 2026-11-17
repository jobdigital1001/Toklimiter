import Link from "next/link";
import { BadgeCheck, Briefcase, MapPin, Sparkles } from "lucide-react";
import { CompanyLogo } from "@/components/company-logo";
import { SaveJobButton } from "@/components/save-job-button";
import { Badge } from "@/components/ui/badge";
import { ARRANGEMENT_LABELS, EMPLOYMENT_TYPE_LABELS } from "@/lib/constants";
import type { JobCardData } from "@/lib/jobs";
import { cn, formatSalary, timeAgo } from "@/lib/utils";

export type Viewer = { signedIn: boolean; canSave: boolean };

export function JobCard({
  job,
  saved = false,
  viewer,
  className,
}: {
  job: JobCardData;
  saved?: boolean;
  viewer: Viewer;
  className?: string;
}) {
  const salary = formatSalary(job.salaryMin, job.salaryMax, job.currency);
  return (
    <article className={cn("group relative flex h-full flex-col rounded-2xl border bg-card p-5 card-lift", className)}>
      <div className="flex items-start gap-3.5">
        <CompanyLogo name={job.company.name} logoUrl={job.company.logoUrl} />
        <div className="min-w-0 flex-1">
          <h3 className="leading-snug font-semibold">
            <Link href={`/jobs/${job.slug}`} className="rounded-sm after:absolute after:inset-0 after:rounded-2xl">
              {job.title}
            </Link>
          </h3>
          <p className="mt-0.5 flex items-center gap-1 truncate text-sm text-muted-foreground">
            {job.company.name}
            {job.company.verified && <BadgeCheck className="size-3.5 shrink-0 text-primary" aria-label="Verified company" />}
          </p>
        </div>
        <SaveJobButton jobId={job.id} saved={saved} {...viewer} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <MapPin className="size-3.5" />
          {job.location}
        </span>
        <span className="flex items-center gap-1.5">
          <Briefcase className="size-3.5" />
          {EMPLOYMENT_TYPE_LABELS[job.employmentType]}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge variant="secondary">{ARRANGEMENT_LABELS[job.arrangement]}</Badge>
        <Badge variant="outline">{job.category.name}</Badge>
        {job.featured && (
          <Badge className="border-transparent bg-spark/20 text-foreground">
            <Sparkles className="size-3" />
            Featured
          </Badge>
        )}
      </div>

      <div className="mt-auto flex items-end justify-between gap-3 pt-5 text-sm">
        <span className="font-medium">{salary ?? <span className="font-normal text-muted-foreground">Salary not listed</span>}</span>
        <time className="shrink-0 text-xs text-muted-foreground" dateTime={(job.publishedAt ?? job.createdAt).toISOString()}>
          {timeAgo(job.publishedAt ?? job.createdAt)}
        </time>
      </div>
    </article>
  );
}

export function JobCardSkeleton() {
  return (
    <div className="flex h-52 animate-pulse flex-col rounded-2xl border bg-card p-5">
      <div className="flex gap-3.5">
        <div className="size-12 rounded-xl bg-muted" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-4 w-3/4 rounded bg-muted" />
          <div className="h-3 w-1/3 rounded bg-muted" />
        </div>
      </div>
      <div className="mt-5 h-3 w-1/2 rounded bg-muted" />
      <div className="mt-3 flex gap-2">
        <div className="h-5 w-16 rounded-full bg-muted" />
        <div className="h-5 w-24 rounded-full bg-muted" />
      </div>
      <div className="mt-auto h-4 w-1/3 rounded bg-muted" />
    </div>
  );
}
