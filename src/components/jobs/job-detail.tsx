import Link from "next/link";
import { BadgeCheck, Briefcase, CalendarClock, Clock, GraduationCap, Laptop, MapPin, Wallet } from "lucide-react";
import { CompanyLogo } from "@/components/company-logo";
import { Badge } from "@/components/ui/badge";
import { ARRANGEMENT_LABELS, EMPLOYMENT_TYPE_LABELS, EXPERIENCE_LEVEL_LABELS } from "@/lib/constants";
import type { JobCardData } from "@/lib/jobs";
import { formatDate, formatSalary, timeAgo } from "@/lib/utils";

/** Header + body of a job, shared by the public page and the recruiter preview. */
export function JobDetailHeader({ job, actions }: { job: JobCardData; actions?: React.ReactNode }) {
  const salary = formatSalary(job.salaryMin, job.salaryMax, job.currency);
  const facts = [
    { icon: MapPin, label: "Location", value: job.location },
    { icon: Laptop, label: "Work arrangement", value: ARRANGEMENT_LABELS[job.arrangement] },
    { icon: Briefcase, label: "Employment type", value: EMPLOYMENT_TYPE_LABELS[job.employmentType] },
    { icon: GraduationCap, label: "Experience", value: EXPERIENCE_LEVEL_LABELS[job.experienceLevel] },
    { icon: Wallet, label: "Salary", value: salary ?? "Not listed" },
    { icon: Clock, label: "Posted", value: job.publishedAt ? timeAgo(job.publishedAt) : "Not yet published" },
    ...(job.deadline ? [{ icon: CalendarClock, label: "Apply by", value: formatDate(job.deadline) }] : []),
  ];
  return (
    <header>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <CompanyLogo name={job.company.name} logoUrl={job.company.logoUrl} size="lg" className="size-16 text-xl sm:size-20 sm:text-2xl" />
        <div className="min-w-0 flex-1">
          <Badge variant="outline" className="mb-2">
            {job.category.name}
          </Badge>
          <h1 className="text-3xl leading-tight font-semibold sm:text-4xl">{job.title}</h1>
          <p className="mt-2 flex items-center gap-1.5 text-muted-foreground">
            <Link href={`/companies/${job.company.slug}`} className="font-medium text-foreground underline-offset-4 hover:underline">
              {job.company.name}
            </Link>
            {job.company.verified && <BadgeCheck className="size-4 text-primary" aria-label="Verified company" />}
          </p>
        </div>
      </div>
      <dl className="mt-7 grid grid-cols-2 gap-x-4 gap-y-5 rounded-2xl border bg-card p-5 sm:grid-cols-3 lg:grid-cols-4">
        {facts.map((f) => (
          <div key={f.label} className="min-w-0">
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <f.icon className="size-3.5" />
              {f.label}
            </dt>
            <dd className="mt-1 text-sm font-medium break-words">{f.value}</dd>
          </div>
        ))}
      </dl>
      {actions && <div className="mt-5 flex flex-wrap gap-3">{actions}</div>}
    </header>
  );
}

function BulletSection({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <section>
      <h2 className="text-xl font-semibold">{title}</h2>
      <ul className="mt-4 space-y-2.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-3 text-[0.95rem] leading-7 text-foreground/85">
            <span aria-hidden="true" className="mt-[0.7rem] size-1.5 shrink-0 rounded-full bg-primary" />
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function JobDetailBody({ job }: { job: JobCardData }) {
  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-xl font-semibold">About the role</h2>
        <p className="prose-plain mt-4">{job.description}</p>
      </section>
      <BulletSection title="Responsibilities" items={job.responsibilities} />
      <BulletSection title="Requirements" items={job.requirements} />
      <BulletSection title="Benefits" items={job.benefits} />
      {job.skills.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold">Skills</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {job.skills.map((s) => (
              <li key={s}>
                <Badge variant="secondary" className="px-3 py-1 text-sm font-normal">
                  {s}
                </Badge>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
