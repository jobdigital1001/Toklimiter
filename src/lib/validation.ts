import { z } from "zod";
import {
  ALERT_FREQUENCIES,
  APPLICATION_STATUSES,
  ARRANGEMENTS,
  COMPANY_SIZES,
  EMPLOYMENT_TYPES,
  EXPERIENCE_LEVELS,
  REPORT_REASONS,
  ROLES,
  VISIBILITIES,
} from "@/lib/constants";

/* Schemas avoid transforms/defaults so that form input and output types are identical. */

const optionalText = (max: number) => z.string().trim().max(max, `Keep this under ${max} characters`);

const optionalUrl = z
  .string()
  .trim()
  .max(300)
  .refine((v) => v === "" || /^https?:\/\/[^\s.]+\.[^\s]+$/i.test(v), "Enter a full URL starting with https://");

const stringList = (maxItems: number, maxLen: number) =>
  z.array(z.string().trim().min(1).max(maxLen, `Each item must be under ${maxLen} characters`)).max(maxItems);

export const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address").max(254);

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(72, "Use at most 72 characters")
  .regex(/[a-zA-Z]/, "Include at least one letter")
  .regex(/[0-9]/, "Include at least one number");

export const signUpSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(80),
  email: emailSchema,
  password: passwordSchema,
  role: z.enum(["CANDIDATE", "RECRUITER"]),
});
export type SignUpInput = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password").max(72),
});
export type SignInInput = z.infer<typeof signInSchema>;

export const profileSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(80),
  headline: optionalText(120),
  location: optionalText(80),
  bio: optionalText(2000),
  phone: z
    .string()
    .trim()
    .max(30)
    .refine((v) => v === "" || /^[+()\-.\s\d]{6,30}$/.test(v), "Enter a valid phone number"),
  skills: stringList(30, 40),
  portfolioUrl: optionalUrl,
  linkedinUrl: optionalUrl,
  githubUrl: optionalUrl,
  visibility: z.enum(VISIBILITIES),
});
export type ProfileInput = z.infer<typeof profileSchema>;

const monthString = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Pick a month");

export const experienceSchema = z
  .object({
    title: z.string().trim().min(2, "Enter a job title").max(100),
    company: z.string().trim().min(1, "Enter a company").max(100),
    location: optionalText(80),
    startDate: monthString,
    endDate: z.union([monthString, z.literal("")]),
    description: optionalText(1500),
  })
  .refine((v) => v.endDate === "" || v.endDate >= v.startDate, {
    path: ["endDate"],
    message: "End date must be after the start date",
  });
export type ExperienceInput = z.infer<typeof experienceSchema>;

const currentYear = new Date().getFullYear();
const year = z.number({ error: "Enter a year" }).int().min(1950, "Enter a valid year").max(currentYear + 10);

export const educationSchema = z
  .object({
    school: z.string().trim().min(2, "Enter a school").max(120),
    degree: z.string().trim().min(2, "Enter a degree").max(120),
    field: optionalText(120),
    startYear: year,
    endYear: year.nullable(),
  })
  .refine((v) => v.endYear == null || v.endYear >= v.startYear, {
    path: ["endYear"],
    message: "End year must be after the start year",
  });
export type EducationInput = z.infer<typeof educationSchema>;

export const companySchema = z.object({
  name: z.string().trim().min(2, "Enter the company name").max(80),
  tagline: optionalText(140),
  description: z.string().trim().min(40, "Write at least a couple of sentences (40+ characters)").max(4000),
  logoUrl: optionalUrl,
  bannerUrl: optionalUrl,
  website: optionalUrl,
  location: z.string().trim().min(2, "Enter a headquarters location").max(80),
  industry: z.string().trim().min(2, "Choose an industry").max(60),
  size: z.enum(COMPANY_SIZES, "Choose a company size"),
  culture: optionalText(3000),
  highlights: stringList(8, 160),
  linkedinUrl: optionalUrl,
  twitterUrl: optionalUrl,
  githubUrl: optionalUrl,
});
export type CompanyInput = z.infer<typeof companySchema>;

const salary = z
  .number({ error: "Enter a number" })
  .int("Use whole numbers")
  .min(0)
  .max(10_000_000, "That salary looks too high")
  .nullable();

const jobContentShape = {
  title: z.string().trim().min(3, "Enter a job title").max(120),
  categoryId: z.string().min(1, "Choose a category"),
  description: z.string().trim().min(50, "Describe the role in at least 50 characters").max(8000),
  responsibilities: stringList(20, 300),
  requirements: stringList(20, 300),
  benefits: stringList(20, 300),
  skills: stringList(20, 40),
  screeningQuestions: stringList(5, 300),
};

export const jobSchema = z
  .object({
    ...jobContentShape,
    location: z.string().trim().min(2, "Enter a location (or “Worldwide” for remote roles)").max(80),
    arrangement: z.enum(ARRANGEMENTS, "Choose a work arrangement"),
    employmentType: z.enum(EMPLOYMENT_TYPES, "Choose an employment type"),
    experienceLevel: z.enum(EXPERIENCE_LEVELS, "Choose an experience level"),
    salaryMin: salary,
    salaryMax: salary,
    currency: z.enum(["USD", "EUR", "GBP", "CAD", "AUD"]),
    deadline: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"), z.literal("")]),
  })
  .refine((v) => v.salaryMin == null || v.salaryMax == null || v.salaryMax >= v.salaryMin, {
    path: ["salaryMax"],
    message: "Maximum salary must be at least the minimum",
  });
export type JobInput = z.infer<typeof jobSchema>;

export const templateSchema = z.object({
  name: z.string().trim().min(2, "Name this template").max(80),
  title: z.string().trim().min(3, "Enter a default job title").max(120),
  categoryId: z.string(),
  employmentType: z.union([z.enum(EMPLOYMENT_TYPES), z.literal("")]),
  arrangement: z.union([z.enum(ARRANGEMENTS), z.literal("")]),
  description: z.string().trim().min(20, "Add a short description (20+ characters)").max(8000),
  responsibilities: jobContentShape.responsibilities,
  requirements: jobContentShape.requirements,
  benefits: jobContentShape.benefits,
  skills: jobContentShape.skills,
  screeningQuestions: jobContentShape.screeningQuestions,
});
export type TemplateInput = z.infer<typeof templateSchema>;

export const applicationSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(80),
  email: emailSchema,
  phone: z
    .string()
    .trim()
    .regex(/^[+()\-.\s\d]{6,30}$/, "Enter a valid phone number"),
  linkUrl: optionalUrl,
  coverLetter: optionalText(4000),
  answers: z.array(z.string().trim().max(1500)).max(5),
  useProfileCv: z.boolean(),
  consent: z.boolean().refine((v) => v, "Please confirm before submitting"),
});
export type ApplicationInput = z.infer<typeof applicationSchema>;

export const applicationStatusSchema = z.enum(APPLICATION_STATUSES);

export const noteSchema = z.object({
  body: z.string().trim().min(1, "Write a note first").max(2000),
});

export const alertSchema = z.object({
  name: z.string().trim().min(2, "Name this alert").max(80),
  q: optionalText(100),
  location: optionalText(80),
  categoryId: z.string(),
  arrangement: z.union([z.enum(ARRANGEMENTS), z.literal("")]),
  employmentType: z.union([z.enum(EMPLOYMENT_TYPES), z.literal("")]),
  experienceLevel: z.union([z.enum(EXPERIENCE_LEVELS), z.literal("")]),
  salaryMin: salary,
  frequency: z.enum(ALERT_FREQUENCIES),
});
export type AlertInput = z.infer<typeof alertSchema>;

export const newsletterSchema = z.object({ email: emailSchema });

export const reportSchema = z.object({
  reason: z.enum(REPORT_REASONS, "Choose a reason"),
  details: optionalText(1000),
});
export type ReportInput = z.infer<typeof reportSchema>;

export const categorySchema = z.object({
  name: z.string().trim().min(2, "Enter a category name").max(60),
  description: optionalText(200),
  icon: z.string().trim().min(1).max(40),
});
export type CategoryInput = z.infer<typeof categorySchema>;

export const settingsSchema = z.object({
  supportEmail: emailSchema,
  announcement: optionalText(200),
  featuredJobsLimit: z.number({ error: "Enter a number" }).int().min(1).max(24),
  jobsPerPage: z.number({ error: "Enter a number" }).int().min(5).max(50),
  allowRegistrations: z.boolean(),
});
export type SettingsInput = z.infer<typeof settingsSchema>;

export const roleSchema = z.enum(ROLES);
