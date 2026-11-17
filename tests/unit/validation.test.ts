import { describe, expect, it } from "vitest";
import { applicationSchema, companySchema, experienceSchema, jobSchema, profileSchema, signUpSchema } from "@/lib/validation";

const validJob = {
  title: "Senior Engineer",
  categoryId: "cat_1",
  location: "Remote",
  arrangement: "REMOTE",
  employmentType: "FULL_TIME",
  experienceLevel: "SENIOR",
  salaryMin: 100000,
  salaryMax: 140000,
  currency: "USD",
  description: "A".repeat(60),
  responsibilities: ["Build things"],
  requirements: [],
  benefits: [],
  skills: ["TypeScript"],
  screeningQuestions: [],
  deadline: "",
};

const errorPaths = (result: { success: boolean; error?: { issues: { path: PropertyKey[] }[] } }) =>
  result.success ? [] : result.error!.issues.map((i) => i.path.join("."));

describe("signUpSchema", () => {
  it("accepts a valid sign-up and lowercases the email", () => {
    const result = signUpSchema.safeParse({ name: "Casey", email: " Casey@Example.COM ", password: "hunter2hunter", role: "CANDIDATE" });
    expect(result.success && result.data.email).toBe("casey@example.com");
  });
  it("rejects weak passwords", () => {
    expect(errorPaths(signUpSchema.safeParse({ name: "Casey", email: "c@example.com", password: "short1", role: "CANDIDATE" }))).toContain("password");
    expect(errorPaths(signUpSchema.safeParse({ name: "Casey", email: "c@example.com", password: "onlyletters", role: "CANDIDATE" }))).toContain("password");
  });
  it("does not allow self-registering as an admin", () => {
    expect(errorPaths(signUpSchema.safeParse({ name: "Casey", email: "c@example.com", password: "hunter2hunter", role: "ADMIN" }))).toContain("role");
  });
});

describe("jobSchema", () => {
  it("accepts a valid job", () => expect(jobSchema.safeParse(validJob).success).toBe(true));
  it("requires max salary to be at least the minimum", () => {
    expect(errorPaths(jobSchema.safeParse({ ...validJob, salaryMin: 150000, salaryMax: 100000 }))).toContain("salaryMax");
  });
  it("allows salary to be omitted", () => {
    expect(jobSchema.safeParse({ ...validJob, salaryMin: null, salaryMax: null }).success).toBe(true);
  });
  it("limits screening questions to five", () => {
    const result = jobSchema.safeParse({ ...validJob, screeningQuestions: Array.from({ length: 6 }, (_, i) => `Question ${i}?`) });
    expect(errorPaths(result)).toContain("screeningQuestions");
  });
  it("requires a real description and a category", () => {
    expect(errorPaths(jobSchema.safeParse({ ...validJob, description: "Too short", categoryId: "" }))).toEqual(
      expect.arrayContaining(["description", "categoryId"]),
    );
  });
  it("validates the deadline format", () => {
    expect(jobSchema.safeParse({ ...validJob, deadline: "2027-01-31" }).success).toBe(true);
    expect(errorPaths(jobSchema.safeParse({ ...validJob, deadline: "31/01/2027" }))).toContain("deadline");
  });
});

describe("applicationSchema", () => {
  const valid = {
    fullName: "Casey Candidate",
    email: "casey@example.com",
    phone: "+1 (555) 010-1234",
    linkUrl: "",
    coverLetter: "",
    answers: [],
    useProfileCv: false,
    consent: true,
  };
  it("accepts a valid application", () => expect(applicationSchema.safeParse(valid).success).toBe(true));
  it("requires consent", () => expect(errorPaths(applicationSchema.safeParse({ ...valid, consent: false }))).toContain("consent"));
  it("validates phone and link", () => {
    expect(errorPaths(applicationSchema.safeParse({ ...valid, phone: "call me" }))).toContain("phone");
    expect(errorPaths(applicationSchema.safeParse({ ...valid, linkUrl: "javascript:alert(1)" }))).toContain("linkUrl");
    expect(applicationSchema.safeParse({ ...valid, linkUrl: "https://linkedin.com/in/casey" }).success).toBe(true);
  });
});

describe("profile and company URLs", () => {
  const profile = { name: "Casey", headline: "", location: "", bio: "", phone: "", skills: [], portfolioUrl: "", linkedinUrl: "", githubUrl: "", visibility: "RECRUITERS" };
  it("accepts empty optional fields", () => expect(profileSchema.safeParse(profile).success).toBe(true));
  it("only accepts http(s) URLs", () => {
    expect(errorPaths(profileSchema.safeParse({ ...profile, portfolioUrl: "ftp://files.example.com" }))).toContain("portfolioUrl");
    expect(errorPaths(profileSchema.safeParse({ ...profile, githubUrl: "github.com/casey" }))).toContain("githubUrl");
  });
  it("requires a meaningful company description", () => {
    const result = companySchema.safeParse({
      name: "Acme", tagline: "", description: "Short", logoUrl: "", bannerUrl: "", website: "", location: "Berlin", industry: "SaaS",
      size: "11-50", culture: "", highlights: [], linkedinUrl: "", twitterUrl: "", githubUrl: "",
    });
    expect(errorPaths(result)).toEqual(["description"]);
  });
});

describe("experienceSchema", () => {
  const base = { title: "Engineer", company: "Acme", location: "", startDate: "2022-01", endDate: "", description: "" };
  it("allows a current role with no end date", () => expect(experienceSchema.safeParse(base).success).toBe(true));
  it("rejects an end date before the start", () => {
    expect(errorPaths(experienceSchema.safeParse({ ...base, endDate: "2021-06" }))).toContain("endDate");
  });
});
