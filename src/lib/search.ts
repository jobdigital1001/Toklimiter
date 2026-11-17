import {
  ARRANGEMENTS,
  EMPLOYMENT_TYPES,
  EXPERIENCE_LEVELS,
  SORTS,
  type Arrangement,
  type EmploymentTypeValue,
  type ExperienceLevelValue,
  type SortValue,
} from "@/lib/constants";

export type JobFilters = {
  q: string;
  location: string;
  category: string;
  arrangement: Arrangement | "";
  type: EmploymentTypeValue | "";
  level: ExperienceLevelValue | "";
  salaryMin: number | null;
  sort: SortValue;
  page: number;
};

type RawParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

function oneOf<T extends string>(value: string, allowed: readonly T[]): T | "" {
  const upper = value.toUpperCase();
  return (allowed as readonly string[]).includes(upper) ? (upper as T) : "";
}

/** Parse and sanitise untrusted URL search params into a typed filter object. */
export function parseJobFilters(params: RawParams): JobFilters {
  const q = first(params.q).trim().slice(0, 100);
  const salary = Number.parseInt(first(params.salaryMin), 10);
  const page = Number.parseInt(first(params.page), 10);
  const sortRaw = first(params.sort).toLowerCase();
  const sort = (SORTS as readonly string[]).includes(sortRaw)
    ? (sortRaw as SortValue)
    : q
      ? "relevance"
      : "newest";
  return {
    q,
    location: first(params.location).trim().slice(0, 80),
    category: first(params.category).trim().toLowerCase().slice(0, 80),
    arrangement: oneOf(first(params.arrangement), ARRANGEMENTS),
    type: oneOf(first(params.type), EMPLOYMENT_TYPES),
    level: oneOf(first(params.level), EXPERIENCE_LEVELS),
    salaryMin: Number.isFinite(salary) && salary > 0 ? Math.min(salary, 10_000_000) : null,
    sort,
    page: Number.isFinite(page) && page > 0 ? Math.min(page, 10_000) : 1,
  };
}

/** Serialise filters back into a query string, omitting defaults. */
export function filtersToQuery(filters: Partial<JobFilters>, overrides: Partial<JobFilters> = {}): string {
  const merged = { ...filters, ...overrides };
  const params = new URLSearchParams();
  if (merged.q) params.set("q", merged.q);
  if (merged.location) params.set("location", merged.location);
  if (merged.category) params.set("category", merged.category);
  if (merged.arrangement) params.set("arrangement", merged.arrangement);
  if (merged.type) params.set("type", merged.type);
  if (merged.level) params.set("level", merged.level);
  if (merged.salaryMin) params.set("salaryMin", String(merged.salaryMin));
  if (merged.sort && merged.sort !== (merged.q ? "relevance" : "newest")) params.set("sort", merged.sort);
  if (merged.page && merged.page > 1) params.set("page", String(merged.page));
  const s = params.toString();
  return s ? `?${s}` : "";
}

export function countActiveFilters(f: JobFilters): number {
  return [f.q, f.location, f.category, f.arrangement, f.type, f.level, f.salaryMin].filter(Boolean).length;
}

export function tokenize(q: string): string[] {
  return Array.from(
    new Set(
      q
        .toLowerCase()
        .split(/[^a-z0-9+#.]+/)
        .filter((t) => t.length > 1),
    ),
  ).slice(0, 8);
}

export type Scorable = {
  title: string;
  skills: string[];
  companyName: string;
  categoryName: string;
  description: string;
  featured?: boolean;
  publishedAt?: Date | null;
};

/**
 * Lightweight relevance score: title matches weigh most, then skills, company/category, description.
 * A small freshness and featured boost breaks ties.
 */
export function relevanceScore(job: Scorable, q: string, now: Date = new Date()): number {
  const tokens = tokenize(q);
  if (tokens.length === 0) return 0;
  const title = job.title.toLowerCase();
  const skills = job.skills.map((s) => s.toLowerCase());
  const company = job.companyName.toLowerCase();
  const category = job.categoryName.toLowerCase();
  const description = job.description.toLowerCase();

  let score = 0;
  for (const token of tokens) {
    if (title.includes(token)) score += 10;
    if (skills.some((s) => s === token)) score += 6;
    else if (skills.some((s) => s.includes(token))) score += 4;
    if (company.includes(token)) score += 4;
    if (category.includes(token)) score += 3;
    if (description.includes(token)) score += 1;
  }
  if (title.includes(q.trim().toLowerCase())) score += 8;
  if (score === 0) return 0;

  if (job.featured) score += 1;
  if (job.publishedAt) {
    const ageDays = (now.getTime() - job.publishedAt.getTime()) / 86_400_000;
    score += Math.max(0, 2 - ageDays / 15);
  }
  return Math.round(score * 100) / 100;
}

/** Windowed page list with ellipses, e.g. [1, "…", 4, 5, 6, "…", 20]. */
export function paginationRange(current: number, total: number, siblings = 1): (number | "…")[] {
  if (total <= 1) return total === 1 ? [1] : [];
  const pages = new Set<number>([1, total]);
  for (let p = current - siblings; p <= current + siblings; p++) {
    if (p >= 1 && p <= total) pages.add(p);
  }
  const sorted = Array.from(pages).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
      out.push(sorted[i] - sorted[i - 1] === 2 ? sorted[i] - 1 : "…");
    }
    out.push(sorted[i]);
  }
  return out;
}
