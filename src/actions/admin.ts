"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { fail, invalid, ok, UNAUTHORIZED, type ActionResult } from "@/lib/action-result";
import { uniqueSlug } from "@/lib/jobs";
import { actionUser } from "@/lib/session";
import { slugify } from "@/lib/utils";
import {
  categorySchema,
  roleSchema,
  settingsSchema,
  templateSchema,
  type CategoryInput,
  type SettingsInput,
  type TemplateInput,
} from "@/lib/validation";

const admin = () => actionUser("ADMIN");

function done(message: string): ActionResult {
  revalidatePath("/admin", "layout");
  return ok(undefined, message);
}

/* ── Users ── */

async function isLastActiveAdmin(userId: string) {
  const others = await db.user.count({ where: { role: "ADMIN", status: "ACTIVE", id: { not: userId } } });
  return others === 0;
}

export async function setUserRoleAction(userId: string, role: string): Promise<ActionResult> {
  const me = await admin();
  if (!me) return UNAUTHORIZED;
  const parsed = roleSchema.safeParse(role);
  if (!parsed.success) return fail("Unknown role.");
  const target = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!target) return fail("User not found.");
  if (target.role === "ADMIN" && parsed.data !== "ADMIN" && (await isLastActiveAdmin(userId))) {
    return fail("You can’t demote the last active admin.");
  }
  await db.user.update({
    where: { id: userId },
    data: {
      role: parsed.data,
      onboardedAt: new Date(),
      ...(parsed.data !== "RECRUITER" ? { companyId: null } : {}),
      ...(parsed.data === "CANDIDATE" ? { profile: { connectOrCreate: { where: { userId }, create: {} } } } : {}),
    },
  });
  return done("Role updated");
}

export async function setUserStatusAction(userId: string, suspended: boolean): Promise<ActionResult> {
  const me = await admin();
  if (!me) return UNAUTHORIZED;
  if (userId === me.id) return fail("You can’t suspend your own account.");
  const target = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!target) return fail("User not found.");
  if (suspended && target.role === "ADMIN" && (await isLastActiveAdmin(userId))) {
    return fail("You can’t suspend the last active admin.");
  }
  await db.user.update({ where: { id: userId }, data: { status: suspended ? "SUSPENDED" : "ACTIVE" } });
  return done(suspended ? "User suspended" : "User reactivated");
}

/* ── Companies ── */

export async function setCompanyFlagAction(
  companyId: string,
  flag: "verified" | "suspended",
  value: boolean,
): Promise<ActionResult> {
  if (!(await admin())) return UNAUTHORIZED;
  if (flag !== "verified" && flag !== "suspended") return fail("Unknown action.");
  const res = await db.company.updateMany({ where: { id: companyId }, data: { [flag]: Boolean(value) } });
  if (res.count === 0) return fail("Company not found.");
  revalidatePath("/companies");
  const messages = {
    verified: value ? "Company verified" : "Verification removed",
    suspended: value ? "Company suspended — its jobs are hidden" : "Company reinstated",
  };
  return done(messages[flag]);
}

/* ── Jobs ── */

export async function setJobFeaturedAction(jobId: string, featured: boolean): Promise<ActionResult> {
  if (!(await admin())) return UNAUTHORIZED;
  await db.job.updateMany({ where: { id: jobId }, data: { featured: Boolean(featured) } });
  revalidatePath("/");
  return done(featured ? "Job featured" : "Job unfeatured");
}

export async function adminCloseJobAction(jobId: string): Promise<ActionResult> {
  if (!(await admin())) return UNAUTHORIZED;
  await db.job.updateMany({ where: { id: jobId }, data: { status: "CLOSED", featured: false } });
  return done("Job closed");
}

export async function adminDeleteJobAction(jobId: string): Promise<ActionResult> {
  if (!(await admin())) return UNAUTHORIZED;
  await db.job.deleteMany({ where: { id: jobId } });
  return done("Job deleted");
}

/* ── Categories ── */

export async function saveCategoryAction(id: string | null, input: CategoryInput): Promise<ActionResult> {
  if (!(await admin())) return UNAUTHORIZED;
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { name, description, icon } = parsed.data;
  const clash = await db.category.findFirst({
    where: { name: { equals: name, mode: "insensitive" }, ...(id ? { id: { not: id } } : {}) },
    select: { id: true },
  });
  if (clash) return fail("Please fix the highlighted fields.", { name: "A category with this name already exists" });
  if (id) {
    await db.category.update({ where: { id }, data: { name, description: description || null, icon } });
  } else {
    const slug = await uniqueSlug(slugify(name), async (s) => Boolean(await db.category.findUnique({ where: { slug: s }, select: { id: true } })));
    await db.category.create({ data: { name, slug, description: description || null, icon } });
  }
  revalidatePath("/");
  return done("Category saved");
}

export async function deleteCategoryAction(id: string): Promise<ActionResult> {
  if (!(await admin())) return UNAUTHORIZED;
  const jobs = await db.job.count({ where: { categoryId: id } });
  if (jobs > 0) return fail(`This category still has ${jobs} job${jobs === 1 ? "" : "s"}. Move or delete them first.`);
  await db.category.deleteMany({ where: { id } });
  return done("Category deleted");
}

/* ── System templates ── */

export async function saveSystemTemplateAction(id: string | null, input: TemplateInput): Promise<ActionResult> {
  if (!(await admin())) return UNAUTHORIZED;
  const parsed = templateSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const t = parsed.data;
  const data = {
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
  if (id) {
    const res = await db.jobTemplate.updateMany({ where: { id, isSystem: true }, data });
    if (res.count === 0) return fail("Template not found.");
  } else {
    await db.jobTemplate.create({ data: { ...data, isSystem: true } });
  }
  return done("Template saved");
}

export async function deleteSystemTemplateAction(id: string): Promise<ActionResult> {
  if (!(await admin())) return UNAUTHORIZED;
  await db.jobTemplate.deleteMany({ where: { id, isSystem: true } });
  return done("Template deleted");
}

/* ── Reports ── */

export async function resolveReportAction(id: string, status: "RESOLVED" | "DISMISSED"): Promise<ActionResult> {
  if (!(await admin())) return UNAUTHORIZED;
  if (status !== "RESOLVED" && status !== "DISMISSED") return fail("Unknown status.");
  await db.report.updateMany({ where: { id }, data: { status, resolvedAt: new Date() } });
  return done(status === "RESOLVED" ? "Report resolved" : "Report dismissed");
}

/* ── Settings ── */

export async function saveSettingsAction(input: SettingsInput): Promise<ActionResult> {
  if (!(await admin())) return UNAUTHORIZED;
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  await db.$transaction(
    Object.entries(parsed.data).map(([key, value]) =>
      db.setting.upsert({ where: { key }, update: { value: String(value) }, create: { key, value: String(value) } }),
    ),
  );
  revalidatePath("/", "layout");
  return done("Settings saved");
}
