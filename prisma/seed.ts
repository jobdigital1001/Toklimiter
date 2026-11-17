/**
 * Seeds reference data (categories, built-in templates) and, unless SEED_DEMO=false, demo content:
 * companies, jobs, and four demo accounts. Safe to re-run: everything is upserted by a natural key.
 *
 * Demo accounts all use the password below. Never seed demo data into a production database.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { CATEGORIES, COMPANIES, JOBS, TEMPLATE_BENEFITS, TEMPLATES } from "./seed-data";

export const DEMO_PASSWORD = "Genius123!";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

async function main() {
  // ── Reference data ──
  const categoryIds = new Map<string, string>();
  for (const c of CATEGORIES) {
    const row = await db.category.upsert({ where: { slug: c.slug }, update: {}, create: { ...c } });
    categoryIds.set(c.slug, row.id);
  }

  for (const t of TEMPLATES) {
    const data = {
      name: t.name,
      isSystem: true,
      title: t.title,
      categoryId: categoryIds.get(t.category)!,
      employmentType: "FULL_TIME" as const,
      description: t.description,
      responsibilities: t.responsibilities,
      requirements: t.requirements,
      benefits: TEMPLATE_BENEFITS,
      skills: t.skills,
      screeningQuestions: t.screeningQuestions,
    };
    const existing = await db.jobTemplate.findFirst({ where: { isSystem: true, name: t.name }, select: { id: true } });
    if (!existing) await db.jobTemplate.create({ data });
  }
  console.log(`Seeded ${CATEGORIES.length} categories and ${TEMPLATES.length} built-in templates.`);

  if (process.env.SEED_DEMO === "false") return;
  if (process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production") {
    console.log("Production environment detected — skipping demo data. Set SEED_DEMO=false to silence this.");
    return;
  }

  // ── Demo companies ──
  const companyIds = new Map<string, string>();
  for (const c of COMPANIES) {
    const row = await db.company.upsert({
      where: { slug: c.slug },
      update: {},
      create: {
        slug: c.slug,
        name: c.name,
        tagline: c.tagline,
        industry: c.industry,
        size: c.size,
        location: c.location,
        verified: c.verified,
        highlights: [...c.highlights],
        website: `https://example.com/${c.slug}`,
        description: `${c.name} is on a mission: ${c.tagline.toLowerCase().replace(/\.$/, "")}. We are a team of builders who care about craft, move with urgency, and take the long view.\n\nWe work in small, autonomous teams with clear ownership. If you want your work to matter from the first week, you will feel at home here.`,
        culture:
          "We default to trust and write things down. Decisions are made close to the work, feedback is direct and kind, and we protect long stretches of focus time. We hire people who are curious, low-ego, and motivated by the mission.",
      },
    });
    companyIds.set(c.slug, row.id);
  }

  // ── Demo users ──
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const user = (email: string, name: string, role: "ADMIN" | "RECRUITER" | "CANDIDATE", companySlug?: string) =>
    db.user.upsert({
      where: { email },
      update: {},
      create: { email, name, role, passwordHash, onboardedAt: new Date(), emailVerified: new Date(), companyId: companySlug ? companyIds.get(companySlug) : null },
    });
  await user("admin@genius.test", "Ada Admin", "ADMIN");
  const recruiter = await user("recruiter@genius.test", "Riley Recruiter", "RECRUITER", "lumen-labs");
  await user("recruiter2@genius.test", "Noor Recruiter", "RECRUITER", "northwind-energy");
  const candidate = await user("candidate@genius.test", "Casey Candidate", "CANDIDATE");
  const candidate2 = await user("candidate2@genius.test", "Jordan Lee", "CANDIDATE");

  await db.candidateProfile.upsert({
    where: { userId: candidate.id },
    update: {},
    create: {
      userId: candidate.id,
      headline: "Frontend engineer who loves design systems",
      location: "Portland, OR",
      bio: "I build fast, accessible interfaces and enjoy working at the boundary of design and engineering. Looking for a senior role on a product-minded team.",
      phone: "+1 555 010 1234",
      skills: ["TypeScript", "React", "Next.js", "Accessibility", "Design Systems"],
      linkedinUrl: "https://www.linkedin.com/in/example",
      githubUrl: "https://github.com/example",
      experiences: { create: [{ title: "Frontend Engineer", company: "Brightside", location: "Remote", startDate: new Date("2021-03-01"), description: "Led the migration to a shared component library." }] },
      educations: { create: [{ school: "Oregon State University", degree: "BSc", field: "Computer Science", startYear: 2014, endYear: 2018 }] },
    },
  });
  await db.candidateProfile.upsert({
    where: { userId: candidate2.id },
    update: {},
    create: { userId: candidate2.id, headline: "Product designer", location: "Berlin, Germany", skills: ["Figma", "Prototyping"], visibility: "PUBLIC" },
  });

  // ── Demo jobs ──
  const templates = new Map(TEMPLATES.map((t) => [t.name, t]));
  const jobIds: string[] = [];
  for (const [i, j] of JOBS.entries()) {
    const t = templates.get(j.template)!;
    const company = COMPANIES.find((c) => c.slug === j.company)!;
    const slug = slugify(`${j.title} ${company.name}`);
    const currency = company.location.includes("UK") ? "GBP" : /Denmark|Germany|Portugal/.test(company.location) ? "EUR" : company.location.includes("Canada") ? "CAD" : "USD";
    const row = await db.job.upsert({
      where: { slug },
      update: {},
      create: {
        slug,
        title: j.title,
        companyId: companyIds.get(j.company)!,
        categoryId: categoryIds.get(t.category)!,
        postedById: j.company === "lumen-labs" ? recruiter.id : null,
        location: j.location ?? company.location,
        arrangement: j.arrangement,
        employmentType: j.type ?? "FULL_TIME",
        experienceLevel: j.level,
        salaryMin: j.salary?.[0] ?? null,
        salaryMax: j.salary?.[1] ?? null,
        currency,
        description: `${company.name} is hiring a ${j.title}. ${t.description}\n\nAbout us: ${company.tagline}`,
        responsibilities: t.responsibilities,
        requirements: t.requirements,
        benefits: TEMPLATE_BENEFITS,
        skills: j.skills ?? t.skills,
        screeningQuestions: t.screeningQuestions,
        status: "PUBLISHED",
        featured: Boolean(j.featured),
        publishedAt: daysAgo(i * 0.8 + 0.2),
        deadline: i % 4 === 0 ? daysAgo(-45) : null,
        views: 40 + ((i * 37) % 260),
      },
    });
    jobIds.push(row.id);
  }

  // A draft and a paused job so recruiters see every state.
  const lumen = companyIds.get("lumen-labs")!;
  for (const extra of [
    { title: "Engineering Manager, Platform", status: "DRAFT" as const },
    { title: "Technical Recruiter", status: "PAUSED" as const },
  ]) {
    const t = templates.get("Operations")!;
    await db.job.upsert({
      where: { slug: slugify(`${extra.title} Lumen Labs`) },
      update: {},
      create: {
        slug: slugify(`${extra.title} Lumen Labs`),
        title: extra.title,
        companyId: lumen,
        categoryId: categoryIds.get(extra.status === "DRAFT" ? "software-engineering" : "operations")!,
        postedById: recruiter.id,
        location: "San Francisco, CA",
        arrangement: "HYBRID",
        employmentType: "FULL_TIME",
        experienceLevel: "SENIOR",
        description: `Lumen Labs is hiring a ${extra.title}. ${t.description}`,
        responsibilities: t.responsibilities,
        requirements: t.requirements,
        benefits: TEMPLATE_BENEFITS,
        skills: t.skills,
        screeningQuestions: [],
        status: extra.status,
        publishedAt: extra.status === "PAUSED" ? daysAgo(20) : null,
      },
    });
  }

  // ── Demo applications (Jordan applies to two Lumen Labs roles) ──
  for (const [n, status] of (["UNDER_REVIEW", "INTERVIEW"] as const).entries()) {
    const jobId = jobIds[n + 1];
    await db.application.upsert({
      where: { jobId_userId: { jobId, userId: candidate2.id } },
      update: {},
      create: {
        jobId,
        userId: candidate2.id,
        fullName: "Jordan Lee",
        email: "candidate2@genius.test",
        phone: "+49 30 5550 1234",
        linkUrl: "https://example.com/jordan",
        coverLetter: "I have followed your work for a while and would love to contribute.",
        answers: [{ question: "Why this role?", answer: "It matches my experience and the mission resonates with me." }],
        status,
        createdAt: daysAgo(3 - n),
      },
    });
  }

  console.log(`Seeded ${COMPANIES.length} companies, ${JOBS.length + 2} jobs and 5 demo users (password: ${DEMO_PASSWORD}).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
