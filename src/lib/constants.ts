export const SITE = {
  name: "Genius JobPortal",
  tagline: "Discover work that matches your genius.",
  description:
    "Genius JobPortal connects exceptional candidates with innovative companies. Search curated roles, apply in minutes, and track every application.",
};

export const ARRANGEMENTS = ["REMOTE", "HYBRID", "ONSITE"] as const;
export const EMPLOYMENT_TYPES = ["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP", "TEMPORARY"] as const;
export const EXPERIENCE_LEVELS = ["ENTRY", "MID", "SENIOR", "LEAD", "EXECUTIVE"] as const;
export const JOB_STATUSES = ["DRAFT", "PUBLISHED", "PAUSED", "CLOSED"] as const;
export const APPLICATION_STATUSES = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "INTERVIEW",
  "OFFER",
  "REJECTED",
  "WITHDRAWN",
] as const;
export const VISIBILITIES = ["PUBLIC", "RECRUITERS", "PRIVATE"] as const;
export const ALERT_FREQUENCIES = ["DAILY", "WEEKLY"] as const;
export const ROLES = ["CANDIDATE", "RECRUITER", "ADMIN"] as const;
export const SORTS = ["newest", "salary", "relevance"] as const;

export type Arrangement = (typeof ARRANGEMENTS)[number];
export type EmploymentTypeValue = (typeof EMPLOYMENT_TYPES)[number];
export type ExperienceLevelValue = (typeof EXPERIENCE_LEVELS)[number];
export type JobStatusValue = (typeof JOB_STATUSES)[number];
export type ApplicationStatusValue = (typeof APPLICATION_STATUSES)[number];
export type SortValue = (typeof SORTS)[number];

export const ARRANGEMENT_LABELS: Record<Arrangement, string> = {
  REMOTE: "Remote",
  HYBRID: "Hybrid",
  ONSITE: "On-site",
};

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentTypeValue, string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACT: "Contract",
  INTERNSHIP: "Internship",
  TEMPORARY: "Temporary",
};

export const EXPERIENCE_LEVEL_LABELS: Record<ExperienceLevelValue, string> = {
  ENTRY: "Entry level",
  MID: "Mid level",
  SENIOR: "Senior",
  LEAD: "Lead / Staff",
  EXECUTIVE: "Executive",
};

export const JOB_STATUS_LABELS: Record<JobStatusValue, string> = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
  PAUSED: "Paused",
  CLOSED: "Closed",
};

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatusValue, string> = {
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under review",
  INTERVIEW: "Interview",
  OFFER: "Offer",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
};

export const VISIBILITY_LABELS: Record<(typeof VISIBILITIES)[number], { label: string; hint: string }> = {
  PUBLIC: { label: "Public", hint: "Any signed-in recruiter can view your profile." },
  RECRUITERS: {
    label: "Recruiters I apply to",
    hint: "Only companies you have applied to can view your profile.",
  },
  PRIVATE: { label: "Private", hint: "Nobody can view your profile. Applications still share what you submit." },
};

export const SORT_LABELS: Record<SortValue, string> = {
  newest: "Newest",
  salary: "Highest salary",
  relevance: "Most relevant",
};

export const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1001-5000", "5000+"] as const;

export const INDUSTRIES = [
  "Artificial Intelligence",
  "Climate & Energy",
  "Developer Tools",
  "Education",
  "Fintech",
  "Healthcare",
  "Media & Entertainment",
  "Robotics & Hardware",
  "SaaS",
  "Security",
  "Other",
] as const;

export const REPORT_REASONS = [
  "Spam or scam",
  "Misleading or inaccurate",
  "Discriminatory content",
  "Role no longer available",
  "Other",
] as const;

export const SALARY_FILTERS = [40000, 60000, 80000, 100000, 130000, 160000, 200000] as const;

export const CV_MAX_BYTES = 4 * 1024 * 1024;
export const CV_EXTENSIONS = [".pdf", ".doc", ".docx"] as const;
export const CV_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;
