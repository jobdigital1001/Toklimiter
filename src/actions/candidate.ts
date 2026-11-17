"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { fail, invalid, ok, UNAUTHORIZED, type ActionResult } from "@/lib/action-result";
import { sendApplicationReceivedEmail, sendNewApplicationEmail, sendNewsletterWelcomeEmail } from "@/lib/email";
import { canCandidateWithdraw, isJobOpen } from "@/lib/job-status";
import { actionUser, getCurrentUser } from "@/lib/session";
import { deleteStoredFile, saveCv, validateCv } from "@/lib/storage";
import {
  alertSchema,
  applicationSchema,
  educationSchema,
  experienceSchema,
  newsletterSchema,
  profileSchema,
  reportSchema,
  type AlertInput,
  type EducationInput,
  type ExperienceInput,
  type ProfileInput,
  type ReportInput,
} from "@/lib/validation";

const orNull = (v: string) => (v.trim() === "" ? null : v.trim());
const monthToDate = (m: string) => new Date(`${m}-01T00:00:00.000Z`);

async function ensureProfile(userId: string) {
  return db.candidateProfile.upsert({ where: { userId }, update: {}, create: { userId }, select: { id: true, cvKey: true } });
}

/* ── Profile ── */

export async function updateProfileAction(input: ProfileInput): Promise<ActionResult> {
  const user = await actionUser("CANDIDATE");
  if (!user) return UNAUTHORIZED;
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { name, ...p } = parsed.data;
  const data = {
    headline: orNull(p.headline),
    location: orNull(p.location),
    bio: orNull(p.bio),
    phone: orNull(p.phone),
    skills: Array.from(new Set(p.skills)),
    portfolioUrl: orNull(p.portfolioUrl),
    linkedinUrl: orNull(p.linkedinUrl),
    githubUrl: orNull(p.githubUrl),
    visibility: p.visibility,
  };
  await db.$transaction([
    db.user.update({ where: { id: user.id }, data: { name } }),
    db.candidateProfile.upsert({ where: { userId: user.id }, update: data, create: { userId: user.id, ...data } }),
  ]);
  revalidatePath("/account");
  return ok(undefined, "Profile saved");
}

export async function uploadCvAction(formData: FormData): Promise<ActionResult> {
  const user = await actionUser("CANDIDATE");
  if (!user) return UNAUTHORIZED;
  const file = formData.get("cv");
  if (!(file instanceof File)) return fail("Choose a file to upload.");
  const problem = validateCv(file);
  if (problem) return fail(problem);
  const profile = await ensureProfile(user.id);
  const stored = await saveCv(file, `profiles/${user.id}`);
  await db.candidateProfile.update({ where: { id: profile.id }, data: { cvKey: stored.key, cvFileName: stored.fileName } });
  await deleteUnreferencedCv(profile.cvKey);
  revalidatePath("/account");
  return ok(undefined, "CV uploaded");
}

export async function removeCvAction(): Promise<ActionResult> {
  const user = await actionUser("CANDIDATE");
  if (!user) return UNAUTHORIZED;
  const profile = await ensureProfile(user.id);
  await db.candidateProfile.update({ where: { id: profile.id }, data: { cvKey: null, cvFileName: null } });
  await deleteUnreferencedCv(profile.cvKey);
  revalidatePath("/account");
  return ok(undefined, "CV removed");
}

/** Applications may point at the same stored file as the profile; only delete when nothing references it. */
async function deleteUnreferencedCv(key: string | null) {
  if (!key) return;
  const inUse = await db.application.count({ where: { cvKey: key } });
  if (inUse === 0) await deleteStoredFile(key);
}

export async function saveExperienceAction(id: string | null, input: ExperienceInput): Promise<ActionResult> {
  const user = await actionUser("CANDIDATE");
  if (!user) return UNAUTHORIZED;
  const parsed = experienceSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const profile = await ensureProfile(user.id);
  const data = {
    title: parsed.data.title,
    company: parsed.data.company,
    location: orNull(parsed.data.location),
    startDate: monthToDate(parsed.data.startDate),
    endDate: parsed.data.endDate ? monthToDate(parsed.data.endDate) : null,
    description: orNull(parsed.data.description),
  };
  if (id) {
    const res = await db.experience.updateMany({ where: { id, profileId: profile.id }, data });
    if (res.count === 0) return fail("That entry no longer exists.");
  } else {
    if ((await db.experience.count({ where: { profileId: profile.id } })) >= 30) return fail("You’ve reached the limit of 30 entries.");
    await db.experience.create({ data: { ...data, profileId: profile.id } });
  }
  revalidatePath("/account");
  return ok(undefined, "Experience saved");
}

export async function deleteExperienceAction(id: string): Promise<ActionResult> {
  const user = await actionUser("CANDIDATE");
  if (!user) return UNAUTHORIZED;
  await db.experience.deleteMany({ where: { id, profile: { userId: user.id } } });
  revalidatePath("/account");
  return ok(undefined, "Experience removed");
}

export async function saveEducationAction(id: string | null, input: EducationInput): Promise<ActionResult> {
  const user = await actionUser("CANDIDATE");
  if (!user) return UNAUTHORIZED;
  const parsed = educationSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const profile = await ensureProfile(user.id);
  const data = { ...parsed.data, field: orNull(parsed.data.field) };
  if (id) {
    const res = await db.education.updateMany({ where: { id, profileId: profile.id }, data });
    if (res.count === 0) return fail("That entry no longer exists.");
  } else {
    if ((await db.education.count({ where: { profileId: profile.id } })) >= 20) return fail("You’ve reached the limit of 20 entries.");
    await db.education.create({ data: { ...data, profileId: profile.id } });
  }
  revalidatePath("/account");
  return ok(undefined, "Education saved");
}

export async function deleteEducationAction(id: string): Promise<ActionResult> {
  const user = await actionUser("CANDIDATE");
  if (!user) return UNAUTHORIZED;
  await db.education.deleteMany({ where: { id, profile: { userId: user.id } } });
  revalidatePath("/account");
  return ok(undefined, "Education removed");
}

/* ── Saved jobs ── */

export async function toggleSaveJobAction(jobId: string): Promise<ActionResult<{ saved: boolean }>> {
  const user = await actionUser("CANDIDATE");
  if (!user) return fail("Sign in as a candidate to save jobs.");
  const key = { userId_jobId: { userId: user.id, jobId } };
  const existing = await db.savedJob.findUnique({ where: key });
  if (existing) {
    await db.savedJob.delete({ where: key });
  } else {
    const job = await db.job.findUnique({ where: { id: jobId }, select: { id: true } });
    if (!job) return fail("This job is no longer available.");
    await db.savedJob.create({ data: { userId: user.id, jobId } });
  }
  revalidatePath("/account/saved");
  return ok({ saved: !existing }, existing ? "Removed from saved jobs" : "Job saved");
}

/* ── Applications ── */

export async function applyToJobAction(jobId: string, formData: FormData): Promise<ActionResult> {
  const user = await actionUser("CANDIDATE");
  if (!user) return fail("Sign in as a candidate to apply.");

  let payload: unknown;
  try {
    payload = JSON.parse(String(formData.get("payload") ?? ""));
  } catch {
    return fail("Something went wrong reading your application. Please try again.");
  }
  const parsed = applicationSchema.safeParse(payload);
  if (!parsed.success) return invalid(parsed.error);
  const input = parsed.data;

  const job = await db.job.findUnique({
    where: { id: jobId },
    include: { company: { select: { name: true, suspended: true, members: { select: { email: true } } } } },
  });
  if (!job || job.company.suspended || !isJobOpen(job)) return fail("This job is no longer accepting applications.");

  const answers: { question: string; answer: string }[] = [];
  const fieldErrors: Record<string, string> = {};
  job.screeningQuestions.forEach((question, i) => {
    const answer = (input.answers[i] ?? "").trim();
    if (!answer) fieldErrors[`answers.${i}`] = "Please answer this question";
    answers.push({ question, answer });
  });
  if (Object.keys(fieldErrors).length > 0) return fail("Please answer all screening questions.", fieldErrors);

  const already = await db.application.findUnique({ where: { jobId_userId: { jobId, userId: user.id } }, select: { id: true } });
  if (already) return fail("You’ve already applied to this job.");

  let cv: { key: string; fileName: string } | null = null;
  const file = formData.get("cv");
  if (!input.useProfileCv && file instanceof File && file.size > 0) {
    const problem = validateCv(file);
    if (problem) return fail(problem, { cv: problem });
    cv = await saveCv(file, `applications/${jobId}`);
  } else {
    const profile = await db.candidateProfile.findUnique({ where: { userId: user.id }, select: { cvKey: true, cvFileName: true } });
    if (profile?.cvKey) cv = { key: profile.cvKey, fileName: profile.cvFileName ?? "cv.pdf" };
  }
  if (!cv) return fail("Please attach your CV.", { cv: "Attach a CV to apply" });

  let application;
  try {
    application = await db.application.create({
      data: {
        jobId,
        userId: user.id,
        fullName: input.fullName,
        email: input.email,
        phone: input.phone,
        linkUrl: orNull(input.linkUrl),
        coverLetter: orNull(input.coverLetter),
        cvKey: cv.key,
        cvFileName: cv.fileName,
        answers,
      },
    });
  } catch {
    return fail("You’ve already applied to this job.");
  }

  await Promise.all([
    sendApplicationReceivedEmail(input.email, { name: input.fullName, jobTitle: job.title, company: job.company.name }),
    sendNewApplicationEmail(
      job.company.members.map((m) => m.email),
      { candidate: input.fullName, jobTitle: job.title, applicationId: application.id },
    ),
  ]);
  revalidatePath(`/jobs/${job.slug}`);
  revalidatePath("/account/applications");
  return ok(undefined, "Application submitted");
}

export async function withdrawApplicationAction(applicationId: string): Promise<ActionResult> {
  const user = await actionUser("CANDIDATE");
  if (!user) return UNAUTHORIZED;
  const application = await db.application.findFirst({ where: { id: applicationId, userId: user.id }, select: { status: true } });
  if (!application) return fail("Application not found.");
  if (!canCandidateWithdraw(application.status)) return fail("This application can no longer be withdrawn.");
  await db.application.update({ where: { id: applicationId }, data: { status: "WITHDRAWN" } });
  revalidatePath("/account/applications");
  return ok(undefined, "Application withdrawn");
}

/* ── Job alerts ── */

function alertData(input: AlertInput) {
  return {
    name: input.name,
    q: orNull(input.q),
    location: orNull(input.location),
    categoryId: input.categoryId || null,
    arrangement: input.arrangement || null,
    employmentType: input.employmentType || null,
    experienceLevel: input.experienceLevel || null,
    salaryMin: input.salaryMin || null,
    frequency: input.frequency,
  };
}

export async function saveAlertAction(id: string | null, input: AlertInput): Promise<ActionResult> {
  const user = await actionUser("CANDIDATE");
  if (!user) return fail("Sign in as a candidate to create job alerts.");
  const parsed = alertSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (parsed.data.categoryId) {
    const category = await db.category.findUnique({ where: { id: parsed.data.categoryId }, select: { id: true } });
    if (!category) return fail("That category no longer exists.", { categoryId: "Choose another category" });
  }
  const data = alertData(parsed.data);
  if (id) {
    const res = await db.jobAlert.updateMany({ where: { id, userId: user.id }, data });
    if (res.count === 0) return fail("That alert no longer exists.");
  } else {
    if ((await db.jobAlert.count({ where: { userId: user.id } })) >= 20) return fail("You can have up to 20 job alerts.");
    await db.jobAlert.create({ data: { ...data, userId: user.id, lastSentAt: new Date() } });
  }
  revalidatePath("/account/alerts");
  return ok(undefined, id ? "Alert updated" : "Alert created");
}

export async function toggleAlertAction(id: string, active: boolean): Promise<ActionResult> {
  const user = await actionUser("CANDIDATE");
  if (!user) return UNAUTHORIZED;
  await db.jobAlert.updateMany({ where: { id, userId: user.id }, data: { active } });
  revalidatePath("/account/alerts");
  return ok(undefined, active ? "Alert resumed" : "Alert paused");
}

export async function deleteAlertAction(id: string): Promise<ActionResult> {
  const user = await actionUser("CANDIDATE");
  if (!user) return UNAUTHORIZED;
  await db.jobAlert.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/account/alerts");
  return ok(undefined, "Alert deleted");
}

/* ── Public ── */

export async function reportJobAction(jobId: string, input: ReportInput): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail("Sign in to report a job.");
  const parsed = reportSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const job = await db.job.findUnique({ where: { id: jobId }, select: { id: true } });
  if (!job) return fail("This job no longer exists.");
  const open = await db.report.count({ where: { jobId, reporterId: user.id, status: "OPEN" } });
  if (open > 0) return ok(undefined, "Thanks — we already have your report.");
  await db.report.create({
    data: { jobId, reporterId: user.id, reason: parsed.data.reason, details: orNull(parsed.data.details) },
  });
  return ok(undefined, "Thanks — our team will review this job.");
}

export async function subscribeNewsletterAction(input: { email: string }): Promise<ActionResult> {
  const parsed = newsletterSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const existing = await db.newsletterSubscriber.findUnique({ where: { email: parsed.data.email } });
  if (!existing) {
    await db.newsletterSubscriber.create({ data: { email: parsed.data.email } });
    await sendNewsletterWelcomeEmail(parsed.data.email);
  }
  // Same response either way so the form cannot be used to probe for subscribers.
  return ok(undefined, "You’re subscribed. Welcome aboard!");
}

export async function trackJobViewAction(jobId: string): Promise<void> {
  if (typeof jobId !== "string" || jobId.length > 40) return;
  await db.job.updateMany({ where: { id: jobId, status: "PUBLISHED" }, data: { views: { increment: 1 } } });
}
