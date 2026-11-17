import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { BadgeCheck, Building2, MapPin, Search, Users } from "lucide-react";
import { CompanyLogo } from "@/components/company-logo";
import { EmptyState } from "@/components/empty-state";
import { Pagination } from "@/components/pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { COMPANY_SIZES } from "@/lib/constants";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { publicJobWhere } from "@/lib/jobs";

export const metadata: Metadata = {
  title: "Companies",
  description: "Explore innovative companies hiring on Genius JobPortal.",
};

const PER_PAGE = 12;
type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function CompaniesPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = first(sp.q).trim().slice(0, 80);
  const industry = first(sp.industry).trim().slice(0, 60);
  const size = (COMPANY_SIZES as readonly string[]).includes(first(sp.size)) ? first(sp.size) : "";
  const hiring = first(sp.hiring) === "1";
  const page = Math.max(1, Number.parseInt(first(sp.page), 10) || 1);

  const openJobs = publicJobWhere();
  const where: Prisma.CompanyWhereInput = {
    suspended: false,
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { tagline: { contains: q, mode: "insensitive" } },
            { location: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(industry ? { industry } : {}),
    ...(size ? { size } : {}),
    ...(hiring ? { jobs: { some: openJobs } } : {}),
  };

  const [companies, total, industries] = await Promise.all([
    db.company.findMany({
      where,
      orderBy: [{ verified: "desc" }, { name: "asc" }],
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: {
        id: true,
        slug: true,
        name: true,
        tagline: true,
        logoUrl: true,
        location: true,
        industry: true,
        size: true,
        verified: true,
        _count: { select: { jobs: { where: openJobs } } },
      },
    }),
    db.company.count({ where }),
    db.company.findMany({ where: { suspended: false }, distinct: ["industry"], select: { industry: true }, orderBy: { industry: "asc" } }),
  ]);

  const hrefFor = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (industry) params.set("industry", industry);
    if (size) params.set("size", size);
    if (hiring) params.set("hiring", "1");
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return `/companies${s ? `?${s}` : ""}`;
  };
  const filtered = Boolean(q || industry || size || hiring);

  return (
    <div className="container-page py-8 sm:py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold sm:text-4xl">Companies building what’s next</h1>
        <p className="mt-2 text-muted-foreground">Get to know the teams behind the roles.</p>
      </header>

      <Form
        key={hrefFor(1)}
        action="/companies"
        role="search"
        aria-label="Filter companies"
        className="mb-8 grid gap-2.5 rounded-2xl border bg-card p-3 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_auto_auto]"
      >
        <label className="relative block">
          <span className="sr-only">Search companies</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" type="search" defaultValue={q} placeholder="Search by name or location" className="h-10 pl-9" />
        </label>
        <NativeSelect name="industry" aria-label="Industry" defaultValue={industry}>
          <option value="">All industries</option>
          {industries.map((i) => (
            <option key={i.industry} value={i.industry}>
              {i.industry}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect name="size" aria-label="Company size" defaultValue={size}>
          <option value="">Any size</option>
          {COMPANY_SIZES.map((s) => (
            <option key={s} value={s}>
              {s} people
            </option>
          ))}
        </NativeSelect>
        <label className="flex h-10 items-center gap-2 px-2 text-sm whitespace-nowrap">
          <input type="checkbox" name="hiring" value="1" defaultChecked={hiring} className="size-4 accent-primary" />
          Hiring now
        </label>
        <Button type="submit" className="h-10">
          Search
        </Button>
      </Form>

      <p className="mb-5 text-sm text-muted-foreground" aria-live="polite">
        <span className="font-medium text-foreground tabular-nums">{total}</span> {total === 1 ? "company" : "companies"}
      </p>

      {companies.length === 0 ? (
        <EmptyState icon={Building2} title="No companies found" description="Try a different search term or remove a filter.">
          {filtered && (
            <Button asChild>
              <Link href="/companies">Clear filters</Link>
            </Button>
          )}
        </EmptyState>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {companies.map((c) => (
            <li key={c.id}>
              <article className="relative flex h-full flex-col rounded-2xl border bg-card p-5 card-lift">
                <div className="flex items-start gap-3.5">
                  <CompanyLogo name={c.name} logoUrl={c.logoUrl} />
                  <div className="min-w-0">
                    <h2 className="flex items-center gap-1.5 leading-snug font-semibold">
                      <Link href={`/companies/${c.slug}`} className="truncate after:absolute after:inset-0 after:rounded-2xl">
                        {c.name}
                      </Link>
                      {c.verified && <BadgeCheck className="size-4 shrink-0 text-primary" aria-label="Verified company" />}
                    </h2>
                    <p className="text-sm text-muted-foreground">{c.industry}</p>
                  </div>
                </div>
                {c.tagline && <p className="mt-4 line-clamp-2 text-sm leading-6 text-muted-foreground">{c.tagline}</p>}
                <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-5 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="size-3.5" />
                    {c.location}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users className="size-3.5" />
                    {c.size}
                  </span>
                  <span className="ml-auto font-medium text-primary">
                    {c._count.jobs} open {c._count.jobs === 1 ? "role" : "roles"}
                  </span>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
      <Pagination page={page} totalPages={Math.ceil(total / PER_PAGE)} hrefFor={hrefFor} />
    </div>
  );
}
