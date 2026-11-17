import "server-only";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { jobCardInclude } from "@/lib/jobs";
import type { ApplicationStatusValue } from "@/lib/constants";
import type { JobInput, TemplateInput } from "@/lib/validation";

/** Loads a job that belongs to the recruiter's company, or 404s. */
export async function getCompanyJob(jobId: string, companyId: string) {
  const job = await db.job.findFirst({
    where: { id: jobId, companyId },
    include: { ...jobCardInclude, _count: { select: { applications: true } } },
  });
  if (!job) notFound();
  return job;
}

export async function statusCounts(where: { jobId?: string; companyId?: string }) {
  const rows = await db.application.groupBy({
    by: ["status"],
    where: where.jobId ? { jobId: where.jobId } : { job: { companyId: where.companyId } },
    _count: { _all: true },
  });
  const counts: Partial<Record<ApplicationStatusValue, number>> = {};
  for (const row of rows) counts[row.status] = row._count._all;
  return counts;
}

type TemplateLike = {
  title: string;
  categoryId: string | null;
  employmentType: JobInput["employmentType"] | null;
  arrangement: JobInput["arrangement"] | null;
  description: string;
  responsibilities: string[];
  requirements: string[];
  benefits: string[];
  skills: string[];
  screeningQuestions: string[];
};

export const EMPTY_JOB: JobInput = {
  title: "",
  categoryId: "",
  location: "",
  arrangement: "REMOTE",
  employmentType: "FULL_TIME",
  experienceLevel: "MID",
  salaryMin: null,
  salaryMax: null,
  currency: "USD",
  description: "",
  responsibilities: [],
  requirements: [],
  benefits: [],
  skills: [],
  screeningQuestions: [],
  deadline: "",
};

export function jobDefaultsFromTemplate(t: TemplateLike): JobInput {
  return {
    ...EMPTY_JOB,
    title: t.title,
    categoryId: t.categoryId ?? "",
    employmentType: t.employmentType ?? EMPTY_JOB.employmentType,
    arrangement: t.arrangement ?? EMPTY_JOB.arrangement,
    description: t.description,
    responsibilities: t.responsibilities,
    requirements: t.requirements,
    benefits: t.benefits,
    skills: t.skills,
    screeningQuestions: t.screeningQuestions,
  };
}

export function templateDefaults(t?: (TemplateLike & { name: string }) | null): TemplateInput {
  return {
    name: t?.name ?? "",
    title: t?.title ?? "",
    categoryId: t?.categoryId ?? "",
    employmentType: t?.employmentType ?? "",
    arrangement: t?.arrangement ?? "",
    description: t?.description ?? "",
    responsibilities: t?.responsibilities ?? [],
    requirements: t?.requirements ?? [],
    benefits: t?.benefits ?? [],
    skills: t?.skills ?? [],
    screeningQuestions: t?.screeningQuestions ?? [],
  };
}
