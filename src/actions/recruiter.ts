"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { fail, invalid, ok, UNAUTHORIZED, type ActionResult } from "@/lib/action-result";
import { sendStatusUpdateEmail } from "@/lib/email";
import { canRecruiterSetStatus, nextJobStatus, type JobAction } from "@/lib/job-status";
import { uniqueSlug } from "@/lib/jobs";
import { actionUser } from "@/lib/session";
import { slugify } from "@/lib/utils";
import {
  applicationStatusSchema,
  companySchema,
  jobSchema,
  noteSchema,
  templateSchema,
  type CompanyInput,
  type JobInput,
  type TemplateInput,
} from "@/lib/validation";

const orNull = (v: string) => (v.trim() === "" ? null : v.trim());

async function recruiterWithCompany() {
  const user = await actionUser("RECRUITER");
  if (!user?.companyId) return null;
  return user as typeof user & { companyId: string };
}

/* ── Company ── */

export async function saveCompanyAction(input: CompanyInput): Promise<ActionResult<{ slug: string }>> {
  const user = await actionUser("RECRUITER");
  if (!user) return UNAUTHORIZED;
  const parsed = companySchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const c = parsed.data;
  const data = {
    name: c.name,
    tagline: orNull(c.tagline),
    description: c.description,
    logoUrl: orNull(c.logoUrl),
    bannerUrl: orNull(c.bannerUrl),
    website: orNull(c.website),
    location: c.location,
    industry: c.industry,
    size: c.size,
    culture: orNull(c.culture),
    highlights: c.highlights,
    linkedinUrl: orNull(c.linkedinUrl),
    twitterUrl: orNull(c.twitterUrl),
    githubUrl: orNull(c.githubUrl),
  };

  let slug: string;
  if (user.companyId) {
    slug = (await db.company.update({ where: { id: user.companyId }, data, select: { slug: true } })).slug;
  } else {
    slug = await uniqueSlug(slugify(c.name), async (s) => Boolean(await db.company.findUnique({ where: { slug: s }, select: { id: true } })));
    await db.company.create({ data: { ...data, slug, members: { connect: { id: user.id } } } });
  }
  revalidatePath("/recruiter", "layout");
  revalidatePath(`/companies/${slug}`);
  return ok({ slug }, "Company profile saved");
}

/* ── Jobs ── */

function jobData(j: JobInput) {
  return {
    title: j.title,
    categoryId: j.categoryId,
    location: j.location,
    arrangement: j.arrangement,
    employmentType: j.employmentType,
    experienceLevel: j.experienceLevel,
    salaryMin: j.salaryMin,
    salaryMax: j.salaryMax,
    currency: j.currency,
    description: j.description,
    responsibilities: j.responsibilities,
    requirements: j.requirements,
    benefits: j.benefits,
    skills: Array.from(new Set(j.skills)),
    screeningQuestions: j.screeningQuestions,
    deadline: j.deadline ? new Date(`${j.deadline}T00:00:00.000Z`) : null,
  };
}

export async function saveJobAction(id: string | null, input: JobInput): Promise<ActionResult<{ id: string }>> {
  const user = await recruiterWithCompany();
  if (!user) return UNAUTHORIZED;
  const parsed = jobSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const category = await db.category.findUnique({ where: { id: parsed.data.categoryId }, select: { id: true } });
  if (!category) return fail("Please fix the highlighted fields.", { categoryId: "Choose a category" });
  const data = jobData(parsed.data);

  if (id) {
    const res = await db.job.updateMany({ where: { id, companyId: user.companyId }, data });
    if (res.count === 0) return fail("Job not found.");
    revalidatePath("/recruiter", "layout");
    return ok({ id }, "Job saved");
  }

  const company = await db.company.findUniqueOrThrow({ where: { id: user.companyId }, select: { name: true } });
  const slug = await uniqueSlug(
    slugify(`${data.title} ${company.name}`),
    async (s) => Boolean(await db.job.findUnique({ where: { slug: s }, select: { id: true } })),
  );
  const job = await db.job.create({ data: { ...data, slug, companyId: user.companyId, postedById: user.id } });
  revalidatePath("/recruiter", "layout");
  return ok({ id: job.id }, "Draft saved");
}

export async function changeJobStatusAction(id: string, action: JobAction): Promise<ActionResult> {
  const user = await recruiterWithCompany();
  if (!user) return UNAUTHORIZED;
  const job = await db.job.findFirst({
    where: { id, companyId: user.companyId },
    select: { status: true, publishedAt: true, slug: true, company: { select: { suspended: true } } },
  });
  if (!job) return fail("Job not found.");
  const next = nextJobStatus(job.status, action);
  if (!next) return fail(`A ${job.status.toLowerCase()} job can’t be ${action === "publish" ? "published" : action + "d"}.`);
  if (next === "PUBLISHED" && job.company.suspended) return fail("Your company is suspended and can’t publish jobs. Contact support.");
  await db.job.update({
    where: { id },
    data: { status: next, publishedAt: next === "PUBLISHED" ? (job.publishedAt ?? new Date()) : job.publishedAt },
  });
  revalidatePath("/recruiter", "layout");
  revalidatePath(`/jobs/${job.slug}`);
  const messages: Record<JobAction, string> = {
    publish: "Job published",
    pause: "Job paused",
    unpause: "Job is live again",
    close: "Job closed",
    reopen: "Job reopened",
  };
  return ok(undefined, messages[action]);
}

export async function deleteJobAction(id: string): Promise<ActionResult> {
  const user = await recruiterWithCompany();
  if (!user) return UNAUTHORIZED;
  const job = await db.job.findFirst({
    where: { id, companyId: user.companyId },
    select: { status: true, _count: { select: { applications: true } } },
  });
  if (!job) return fail("Job not found.");
  if (job.status !== "DRAFT" && job._count.applications > 0) {
    return fail("Jobs with applications can’t be deleted. Close the job instead.");
  }
  await db.job.delete({ where: { id } });
  revalidatePath("/recruiter", "layout");
  return ok(undefined, "Job deleted");
}

/* ── Templates (company-owned) ── */

function templateData(t: TemplateInput) {
  return {
    name: t.name,
    title: t.title,
    categoryId: t.categoryId || null,
    employmentType: t.employmentType || null,
    arrangement: t.arrangement || null,
    description: t.description,
    responsibilities: t.responsibilities,
    requirements: t.requirements,
    benefits: t.benefits,
    skills: t.skills,
    screeningQuestions: t.screeningQuestions,
  };
}

export async function saveTemplateAction(id: string | null, input: TemplateInput): Promise<ActionResult> {
  const user = await recruiterWithCompany();
  if (!user) return UNAUTHORIZED;
  const parsed = templateSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const data = templateData(parsed.data);
  if (id) {
    const res = await db.jobTemplate.updateMany({ where: { id, companyId: user.companyId, isSystem: false }, data });
    if (res.count === 0) return fail("Template not found.");
  } else {
    if ((await db.jobTemplate.count({ where: { companyId: user.companyId } })) >= 50) return fail("You can have up to 50 custom templates.");
    await db.jobTemplate.create({ data: { ...data, companyId: user.companyId } });
  }
  revalidatePath("/recruiter/templates");
  return ok(undefined, "Template saved");
}

export async function deleteTemplateAction(id: string): Promise<ActionResult> {
  const user = await recruiterWithCompany();
  if (!user) return UNAUTHORIZED;
  await db.jobTemplate.deleteMany({ where: { id, companyId: user.companyId, isSystem: false } });
  revalidatePath("/recruiter/templates");
  return ok(undefined, "Template deleted");
}

/* ── Applications ── */

export async function setApplicationStatusAction(applicationId: string, status: string): Promise<ActionResult> {
  const user = await recruiterWithCompany();
  if (!user) return UNAUTHORIZED;
  const parsed = applicationStatusSchema.safeParse(status);
  if (!parsed.success) return fail("Unknown status.");
  const application = await db.application.findFirst({
    where: { id: applicationId, job: { companyId: user.companyId } },
    select: { status: true, email: true, fullName: true, jobId: true, job: { select: { title: true, company: { select: { name: true } } } } },
  });
  if (!application) return fail("Application not found.");
  if (!canRecruiterSetStatus(application.status, parsed.data)) {
    return fail(application.status === "WITHDRAWN" ? "The candidate withdrew this application." : "That status change isn’t allowed.");
  }
  await db.application.update({ where: { id: applicationId }, data: { status: parsed.data } });
  await sendStatusUpdateEmail(application.email, {
    name: application.fullName,
    jobTitle: application.job.title,
    company: application.job.company.name,
    status: parsed.data,
  });
  revalidatePath("/recruiter", "layout");
  return ok(undefined, "Status updated");
}

export async function addNoteAction(applicationId: string, input: { body: string }): Promise<ActionResult> {
  const user = await recruiterWithCompany();
  if (!user) return UNAUTHORIZED;
  const parsed = noteSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const application = await db.application.findFirst({
    where: { id: applicationId, job: { companyId: user.companyId } },
    select: { id: true },
  });
  if (!application) return fail("Application not found.");
  await db.applicationNote.create({ data: { applicationId, authorId: user.id, body: parsed.data.body } });
  revalidatePath(`/recruiter/applications/${applicationId}`);
  return ok(undefined, "Note added");
}

export async function deleteNoteAction(noteId: string): Promise<ActionResult> {
  const user = await recruiterWithCompany();
  if (!user) return UNAUTHORIZED;
  const note = await db.applicationNote.findFirst({
    where: { id: noteId, authorId: user.id, application: { job: { companyId: user.companyId } } },
    select: { applicationId: true },
  });
  if (!note) return fail("You can only delete your own notes.");
  await db.applicationNote.delete({ where: { id: noteId } });
  revalidatePath(`/recruiter/applications/${note.applicationId}`);
  return ok(undefined, "Note deleted");
}
