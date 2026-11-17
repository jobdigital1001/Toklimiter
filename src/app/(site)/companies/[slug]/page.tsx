import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeCheck, Briefcase, Globe, Lightbulb, MapPin, Users } from "lucide-react";
import { CompanyLogo } from "@/components/company-logo";
import { EmptyState } from "@/components/empty-state";
import { JobCard } from "@/components/job-card";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { getSavedJobIds, jobCardInclude, publicJobWhere } from "@/lib/jobs";
import { getCurrentUser } from "@/lib/session";

type Props = { params: Promise<{ slug: string }> };

const getCompany = cache(async (slug: string) =>
  db.company.findFirst({
    where: { slug, suspended: false },
    include: { jobs: { where: publicJobWhere(), include: jobCardInclude, orderBy: { publishedAt: "desc" } } },
  }),
);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const company = await getCompany((await params).slug);
  if (!company) return { title: "Company not found" };
  return {
    title: company.name,
    description: company.tagline ?? company.description.slice(0, 160),
    alternates: { canonical: `/companies/${company.slug}` },
  };
}

export default async function CompanyPage({ params }: Props) {
  const company = await getCompany((await params).slug);
  if (!company) notFound();
  const user = await getCurrentUser();
  const saved = await getSavedJobIds(user?.role === "CANDIDATE" ? user.id : undefined, company.jobs.map((j) => j.id));
  const viewer = { signedIn: Boolean(user), canSave: user?.role === "CANDIDATE" };
  const socials = [
    { label: "Website", href: company.website },
    { label: "LinkedIn", href: company.linkedinUrl },
    { label: "X / Twitter", href: company.twitterUrl },
    { label: "GitHub", href: company.githubUrl },
  ].filter((s): s is { label: string; href: string } => Boolean(s.href));

  return (
    <div className="pb-4">
      <div className="relative h-40 overflow-hidden bg-gradient-to-br from-primary/90 via-primary to-indigo-950 sm:h-56">
        {company.bannerUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={company.bannerUrl} alt="" referrerPolicy="no-referrer" className="size-full object-cover" />
        ) : (
          <div aria-hidden="true" className="absolute inset-0 bg-dots opacity-40" />
        )}
      </div>

      <div className="container-page">
        <div className="-mt-10 flex flex-col gap-5 sm:-mt-12 sm:flex-row sm:items-end">
          <CompanyLogo name={company.name} logoUrl={company.logoUrl} size="lg" className="size-24 text-3xl ring-4 ring-background" />
          <div className="min-w-0 flex-1 sm:pb-1">
            <h1 className="flex items-center gap-2 text-3xl font-semibold sm:text-4xl">
              {company.name}
              {company.verified && <BadgeCheck className="size-6 shrink-0 text-primary" aria-label="Verified company" />}
            </h1>
            {company.tagline && <p className="mt-1.5 text-lg text-muted-foreground">{company.tagline}</p>}
          </div>
          {company.website && (
            <Button asChild variant="outline" className="self-start sm:self-auto">
              <a href={company.website} target="_blank" rel="noopener noreferrer nofollow">
                <Globe /> Visit website
              </a>
            </Button>
          )}
        </div>

        <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <li className="flex items-center gap-1.5">
            <MapPin className="size-4" />
            {company.location}
          </li>
          <li className="flex items-center gap-1.5">
            <Briefcase className="size-4" />
            {company.industry}
          </li>
          <li className="flex items-center gap-1.5">
            <Users className="size-4" />
            {company.size} people
          </li>
        </ul>

        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="min-w-0 space-y-12">
            <section aria-labelledby="about-heading">
              <h2 id="about-heading" className="text-xl font-semibold">
                About {company.name}
              </h2>
              <p className="prose-plain mt-4">{company.description}</p>
            </section>

            {company.culture && (
              <section aria-labelledby="culture-heading">
                <h2 id="culture-heading" className="text-xl font-semibold">
                  Culture
                </h2>
                <p className="prose-plain mt-4">{company.culture}</p>
              </section>
            )}

            <section aria-labelledby="jobs-heading">
              <h2 id="jobs-heading" className="text-xl font-semibold">
                Open jobs <span className="font-normal text-muted-foreground">({company.jobs.length})</span>
              </h2>
              {company.jobs.length === 0 ? (
                <EmptyState
                  className="mt-5"
                  icon={Briefcase}
                  title="No open roles right now"
                  description={`${company.name} isn’t hiring on Genius at the moment. Check back soon.`}
                >
                  <Button asChild variant="outline">
                    <Link href="/jobs">Browse all jobs</Link>
                  </Button>
                </EmptyState>
              ) : (
                <ul className="mt-5 grid gap-4 sm:grid-cols-2">
                  {company.jobs.map((job) => (
                    <li key={job.id}>
                      <JobCard job={job} saved={saved.has(job.id)} viewer={viewer} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            {company.highlights.length > 0 && (
              <section aria-labelledby="highlights-heading" className="rounded-2xl border bg-card p-5">
                <h2 id="highlights-heading" className="flex items-center gap-2 text-sm font-semibold">
                  <Lightbulb className="size-4 text-spark" /> Innovation highlights
                </h2>
                <ul className="mt-4 space-y-3">
                  {company.highlights.map((h, i) => (
                    <li key={i} className="flex gap-3 text-sm leading-6">
                      <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                      {h}
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {socials.length > 0 && (
              <section aria-labelledby="links-heading" className="rounded-2xl border bg-card p-5">
                <h2 id="links-heading" className="text-sm font-semibold">
                  Links
                </h2>
                <ul className="mt-3 space-y-2">
                  {socials.map((s) => (
                    <li key={s.label}>
                      <a
                        href={s.href}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="text-sm text-primary underline-offset-4 hover:underline"
                      >
                        {s.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </aside>
        </div>

        <Link href="/companies" className="mt-12 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> All companies
        </Link>
      </div>
    </div>
  );
}
