import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { relevanceScore, tokenize, type JobFilters } from "@/lib/search";

export const jobCardInclude = {
  company: { select: { name: true, slug: true, logoUrl: true, verified: true } },
  category: { select: { name: true, slug: true } },
} satisfies Prisma.JobInclude;

export type JobCardData = Prisma.JobGetPayload<{ include: typeof jobCardInclude }>;

function startOfTodayUtc(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/** Jobs visible to the public: published, not past deadline, company in good standing. */
export function publicJobWhere(): Prisma.JobWhereInput {
  return {
    status: "PUBLISHED",
    company: { suspended: false },
    OR: [{ deadline: null }, { deadline: { gte: startOfTodayUtc() } }],
  };
}

export type FilterCriteria = Pick<JobFilters, "q" | "location" | "category" | "arrangement" | "type" | "level" | "salaryMin">;

export function buildJobWhere(f: Partial<FilterCriteria> & { categoryId?: string | null }): Prisma.JobWhereInput {
  const and: Prisma.JobWhereInput[] = [publicJobWhere()];

  for (const token of tokenize(f.q ?? "")) {
    and.push({
      OR: [
        { title: { contains: token, mode: "insensitive" } },
        { description: { contains: token, mode: "insensitive" } },
        { skills: { hasSome: [token, token.toUpperCase(), token[0].toUpperCase() + token.slice(1)] } },
        { company: { name: { contains: token, mode: "insensitive" } } },
        { category: { name: { contains: token, mode: "insensitive" } } },
      ],
    });
  }
  if (f.location) and.push({ location: { contains: f.location, mode: "insensitive" } });
  if (f.category) and.push({ category: { slug: f.category } });
  if (f.categoryId) and.push({ categoryId: f.categoryId });
  if (f.arrangement) and.push({ arrangement: f.arrangement });
  if (f.type) and.push({ employmentType: f.type });
  if (f.level) and.push({ experienceLevel: f.level });
  if (f.salaryMin) {
    and.push({
      OR: [{ salaryMax: { gte: f.salaryMin } }, { salaryMax: null, salaryMin: { gte: f.salaryMin } }],
    });
  }
  return { AND: and };
}

const RELEVANCE_CANDIDATE_CAP = 500;

export async function searchJobs(filters: JobFilters, perPage: number) {
  const where = buildJobWhere(filters);
  const skip = (filters.page - 1) * perPage;

  if (filters.sort === "relevance" && filters.q) {
    // Score a capped candidate set in memory; adequate for v1 volumes without a search engine.
    const candidates = await db.job.findMany({
      where,
      take: RELEVANCE_CANDIDATE_CAP,
      orderBy: { publishedAt: "desc" },
      select: {
        id: true,
        title: true,
        skills: true,
        description: true,
        featured: true,
        publishedAt: true,
        company: { select: { name: true } },
        category: { select: { name: true } },
      },
    });
    const ranked = candidates
      .map((c) => ({
        id: c.id,
        score: relevanceScore(
          { ...c, companyName: c.company.name, categoryName: c.category.name },
          filters.q,
        ),
      }))
      .sort((a, b) => b.score - a.score);
    const total = await db.job.count({ where });
    const pageIds = ranked.slice(skip, skip + perPage).map((r) => r.id);
    const rows = await db.job.findMany({ where: { id: { in: pageIds } }, include: jobCardInclude });
    const byId = new Map(rows.map((r) => [r.id, r]));
    const jobs = pageIds.map((id) => byId.get(id)).filter((j): j is JobCardData => Boolean(j));
    return { jobs, total, totalPages: Math.max(1, Math.ceil(Math.min(total, RELEVANCE_CANDIDATE_CAP) / perPage)) };
  }

  const orderBy: Prisma.JobOrderByWithRelationInput[] =
    filters.sort === "salary"
      ? [{ salaryMax: { sort: "desc", nulls: "last" } }, { salaryMin: { sort: "desc", nulls: "last" } }, { publishedAt: "desc" }]
      : [{ publishedAt: "desc" }, { id: "desc" }];

  const [jobs, total] = await Promise.all([
    db.job.findMany({ where, orderBy, skip, take: perPage, include: jobCardInclude }),
    db.job.count({ where }),
  ]);
  return { jobs, total, totalPages: Math.max(1, Math.ceil(total / perPage)) };
}

export async function getSimilarJobs(job: { id: string; categoryId: string; skills: string[] }, take = 3) {
  const candidates = await db.job.findMany({
    where: {
      AND: [publicJobWhere(), { id: { not: job.id } }, { OR: [{ categoryId: job.categoryId }, { skills: { hasSome: job.skills } }] }],
    },
    include: jobCardInclude,
    orderBy: { publishedAt: "desc" },
    take: 30,
  });
  const skillSet = new Set(job.skills.map((s) => s.toLowerCase()));
  return candidates
    .map((c) => ({
      job: c,
      score: (c.categoryId === job.categoryId ? 2 : 0) + c.skills.filter((s) => skillSet.has(s.toLowerCase())).length,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, take)
    .map((c) => c.job);
}

export async function getSavedJobIds(userId: string | undefined, jobIds: string[]): Promise<Set<string>> {
  if (!userId || jobIds.length === 0) return new Set();
  const rows = await db.savedJob.findMany({ where: { userId, jobId: { in: jobIds } }, select: { jobId: true } });
  return new Set(rows.map((r) => r.jobId));
}

/** Unique slug of the form "senior-engineer-acme-x7k2q". */
export async function uniqueSlug(base: string, exists: (slug: string) => Promise<boolean>): Promise<string> {
  const root = base || "item";
  if (!(await exists(root))) return root;
  for (let i = 0; i < 5; i++) {
    const candidate = `${root}-${Math.random().toString(36).slice(2, 7)}`;
    if (!(await exists(candidate))) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
}
