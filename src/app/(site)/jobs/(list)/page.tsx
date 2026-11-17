import type { Metadata } from "next";
import Link from "next/link";
import { SearchX } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { JobCard } from "@/components/job-card";
import { CreateAlertButton } from "@/components/jobs/create-alert-button";
import { JobFilters, SortSelect } from "@/components/jobs/job-filters";
import { Pagination } from "@/components/pagination";
import { Button } from "@/components/ui/button";
import { SORT_LABELS, SORTS } from "@/lib/constants";
import { db } from "@/lib/db";
import { getSavedJobIds, searchJobs } from "@/lib/jobs";
import { countActiveFilters, filtersToQuery, parseJobFilters } from "@/lib/search";
import { getCurrentUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const filters = parseJobFilters(await searchParams);
  const parts = [filters.q, filters.location && `in ${filters.location}`].filter(Boolean).join(" ");
  return {
    title: parts ? `${parts} jobs` : "Find jobs",
    description: "Search open roles at innovative companies by keyword, location, category, salary, and more.",
  };
}

export default async function JobsPage({ searchParams }: Props) {
  const filters = parseJobFilters(await searchParams);
  const [user, settings, categories] = await Promise.all([
    getCurrentUser(),
    getSettings(),
    db.category.findMany({ orderBy: { name: "asc" }, select: { id: true, slug: true, name: true } }),
  ]);
  const { jobs, total, totalPages } = await searchJobs(filters, settings.jobsPerPage);
  const saved = await getSavedJobIds(user?.role === "CANDIDATE" ? user.id : undefined, jobs.map((j) => j.id));
  const viewer = { signedIn: Boolean(user), canSave: user?.role === "CANDIDATE" };
  const activeCount = countActiveFilters(filters);
  const category = categories.find((c) => c.slug === filters.category);
  const sortOptions = SORTS.filter((s) => s !== "relevance" || filters.q).map((s) => ({ value: s, label: SORT_LABELS[s] }));
  const alertName = [filters.q, category?.name, filters.location].filter(Boolean).join(" · ") || "All new jobs";

  return (
    <div className="container-page py-8 sm:py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold sm:text-4xl">{category ? `${category.name} jobs` : "Find your next role"}</h1>
        <p className="mt-2 text-muted-foreground">Search and filter open roles from companies building what’s next.</p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-10">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          {/* Keyed by query so inputs reset when filters change via links or back/forward. */}
          <JobFilters key={filtersToQuery(filters)} filters={filters} categories={categories} activeCount={activeCount} />
        </aside>

        <section aria-label="Search results" className="min-w-0">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground" aria-live="polite">
              <span className="font-medium text-foreground tabular-nums">{total.toLocaleString("en-US")}</span>{" "}
              {total === 1 ? "job" : "jobs"} found
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <CreateAlertButton
                signedIn={Boolean(user)}
                isCandidate={user?.role === "CANDIDATE"}
                suggestedName={alertName.slice(0, 80)}
                criteria={{
                  q: filters.q,
                  location: filters.location,
                  categoryId: category?.id ?? "",
                  arrangement: filters.arrangement,
                  employmentType: filters.type,
                  experienceLevel: filters.level,
                  salaryMin: filters.salaryMin,
                }}
              />
              <SortSelect key={filters.sort} value={filters.sort} options={sortOptions} />
            </div>
          </div>

          {jobs.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="No jobs match your search"
              description="Try removing a filter or searching for a broader term. You can also create an alert to hear when matching roles appear."
            >
              <Button asChild>
                <Link href="/jobs">Clear all filters</Link>
              </Button>
            </EmptyState>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2">
              {jobs.map((job) => (
                <li key={job.id}>
                  <JobCard job={job} saved={saved.has(job.id)} viewer={viewer} />
                </li>
              ))}
            </ul>
          )}

          <Pagination page={filters.page} totalPages={totalPages} hrefFor={(page) => `/jobs${filtersToQuery(filters, { page })}`} />
        </section>
      </div>
    </div>
  );
}
