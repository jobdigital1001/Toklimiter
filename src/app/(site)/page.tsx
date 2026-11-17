import Link from "next/link";
import { ArrowRight, Building2, CheckCircle2 } from "lucide-react";
import { CategoryIcon } from "@/components/category-icon";
import { JobCard } from "@/components/job-card";
import { SearchBar } from "@/components/search-bar";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { db } from "@/lib/db";
import { getSavedJobIds, jobCardInclude, publicJobWhere } from "@/lib/jobs";
import { getCurrentUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";

export default async function HomePage() {
  const [user, settings] = await Promise.all([getCurrentUser(), getSettings()]);
  const where = publicJobWhere();
  const [featured, latest, categories, jobCount, companyCount] = await Promise.all([
    db.job.findMany({
      where: { AND: [where, { featured: true }] },
      include: jobCardInclude,
      orderBy: { publishedAt: "desc" },
      take: settings.featuredJobsLimit,
    }),
    db.job.findMany({ where, include: jobCardInclude, orderBy: { publishedAt: "desc" }, take: 6 }),
    db.category.findMany({
      orderBy: { name: "asc" },
      select: { id: true, slug: true, name: true, icon: true, _count: { select: { jobs: { where } } } },
    }),
    db.job.count({ where }),
    db.company.count({ where: { suspended: false } }),
  ]);
  const saved = await getSavedJobIds(user?.role === "CANDIDATE" ? user.id : undefined, [...featured, ...latest].map((j) => j.id));
  const viewer = { signedIn: Boolean(user), canSave: user?.role === "CANDIDATE" };
  const popular = [...categories].sort((a, b) => b._count.jobs - a._count.jobs).slice(0, 8);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-dots" />
        <div
          aria-hidden="true"
          className="absolute top-[-14rem] left-1/2 -z-10 size-[38rem] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl"
        />
        <div className="container-page pt-16 pb-14 sm:pt-24 sm:pb-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="inline-flex animate-rise items-center gap-2 rounded-full border bg-background/70 px-3.5 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur">
              <span className="size-1.5 rounded-full bg-spark" />
              {jobCount.toLocaleString("en-US")} open roles at {companyCount.toLocaleString("en-US")} innovative companies
            </p>
            <h1 className="mt-6 animate-rise text-[2.6rem] leading-[1.05] font-semibold [animation-delay:80ms] sm:text-6xl lg:text-7xl">
              Discover work that matches your{" "}
              <span className="relative inline-block font-serif font-normal text-primary italic">
                genius.
                <svg
                  aria-hidden="true"
                  viewBox="0 0 200 12"
                  preserveAspectRatio="none"
                  className="absolute -bottom-1 left-0 h-2.5 w-full text-spark sm:-bottom-2 sm:h-3"
                >
                  <path d="M2 8.500C40 2.500 90 2 198 6.500" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                </svg>
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl animate-rise text-base leading-7 text-muted-foreground [animation-delay:160ms] sm:text-lg">
              Curated roles at companies building what’s next. Search, apply in minutes, and track every application in one place.
            </p>
          </div>
          <div className="mx-auto mt-10 max-w-4xl animate-rise [animation-delay:240ms]">
            <SearchBar categories={categories} />
          </div>
        </div>
      </section>

      {/* Featured */}
      {featured.length > 0 && (
        <section aria-labelledby="featured-heading" className="container-page py-10 sm:py-14">
          <Carousel opts={{ align: "start", loop: featured.length > 3 }}>
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <h2 id="featured-heading" className="text-2xl font-semibold sm:text-3xl">
                  Featured jobs
                </h2>
                <p className="mt-1.5 text-sm text-muted-foreground">Hand-picked roles from standout teams.</p>
              </div>
              <div className="hidden gap-2 sm:flex">
                <CarouselPrevious className="static translate-y-0" />
                <CarouselNext className="static translate-y-0" />
              </div>
            </div>
            <CarouselContent className="-ml-4 py-1">
              {featured.map((job) => (
                <CarouselItem key={job.id} className="basis-[88%] pl-4 sm:basis-1/2 lg:basis-1/3">
                  <JobCard job={job} saved={saved.has(job.id)} viewer={viewer} />
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </section>
      )}

      {/* Categories */}
      <section aria-labelledby="categories-heading" className="container-page py-10 sm:py-14">
        <h2 id="categories-heading" className="text-2xl font-semibold sm:text-3xl">
          Popular categories
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">Explore roles by the kind of work you love.</p>
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {popular.map((c) => (
            <li key={c.id}>
              <Link
                href={`/jobs?category=${c.slug}`}
                className="group flex h-full flex-col gap-4 rounded-2xl border bg-card p-4 card-lift sm:p-5"
              >
                <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <CategoryIcon name={c.icon} className="size-5" />
                </span>
                <span>
                  <span className="block leading-snug font-medium">{c.name}</span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">
                    {c._count.jobs} open {c._count.jobs === 1 ? "role" : "roles"}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Latest */}
      <section aria-labelledby="latest-heading" className="container-page py-10 sm:py-14">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 id="latest-heading" className="text-2xl font-semibold sm:text-3xl">
              Latest jobs
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">Fresh opportunities, added daily.</p>
          </div>
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link href="/jobs">
              View all jobs <ArrowRight />
            </Link>
          </Button>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {latest.map((job) => (
            <li key={job.id}>
              <JobCard job={job} saved={saved.has(job.id)} viewer={viewer} />
            </li>
          ))}
        </ul>
        <Button asChild variant="outline" size="lg" className="mt-6 w-full sm:hidden">
          <Link href="/jobs">View all jobs</Link>
        </Button>
      </section>

      {/* For companies */}
      <section aria-labelledby="companies-cta-heading" className="container-page py-10 sm:py-14">
        <div className="relative overflow-hidden rounded-3xl bg-primary px-6 py-12 text-primary-foreground sm:px-12 sm:py-16">
          <div aria-hidden="true" className="absolute -top-24 -right-24 size-80 rounded-full bg-white/10 blur-2xl" />
          <div aria-hidden="true" className="absolute -bottom-32 left-1/3 size-80 rounded-full bg-spark/20 blur-3xl" />
          <div className="relative grid items-center gap-10 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <p className="flex items-center gap-2 text-sm font-medium opacity-80">
                <Building2 className="size-4" /> For companies
              </p>
              <h2 id="companies-cta-heading" className="mt-3 text-3xl font-semibold sm:text-4xl">
                Hire the people who will build your next chapter.
              </h2>
              <p className="mt-4 max-w-lg leading-7 opacity-85">
                Publish a polished role in minutes with reusable templates, review applicants in one pipeline, and see what’s working with
                built-in analytics.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg" variant="secondary" className="bg-white text-indigo-950 hover:bg-white/90">
                  <Link href="/recruiter/jobs/new">Post a job</Link>
                </Button>
                <Button asChild size="lg" variant="ghost" className="text-primary-foreground hover:bg-white/10 hover:text-primary-foreground">
                  <Link href="/for-companies">
                    How it works <ArrowRight />
                  </Link>
                </Button>
              </div>
            </div>
            <ul className="space-y-4 text-[0.95rem]">
              {[
                "Role templates for engineering, product, design, and more",
                "Screening questions and private recruiter notes",
                "Views, applications, and conversion at a glance",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 rounded-xl bg-white/10 p-4 backdrop-blur-sm">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-spark" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
