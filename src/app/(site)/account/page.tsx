import type { Metadata } from "next";
import { CheckCircle2, Circle } from "lucide-react";
import { CvCard } from "@/components/account/cv-card";
import { EducationSection, ExperienceSection } from "@/components/account/history-sections";
import { ProfileForm } from "@/components/account/profile-form";
import { PageHeader } from "@/components/page-header";
import { Progress } from "@/components/ui/progress";
import { db } from "@/lib/db";
import { profileCompleteness } from "@/lib/profile";
import { requireRole } from "@/lib/session";

export const metadata: Metadata = { title: "Your profile" };

const month = (d: Date | null) => (d ? d.toISOString().slice(0, 7) : "");

export default async function ProfilePage() {
  const user = await requireRole("CANDIDATE", "/account");
  const profile = await db.candidateProfile.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
    include: { experiences: { orderBy: { startDate: "desc" } }, educations: { orderBy: { startYear: "desc" } } },
  });

  const completeness = profileCompleteness({
    name: user.name,
    headline: profile.headline,
    location: profile.location,
    bio: profile.bio,
    skills: profile.skills,
    hasCv: Boolean(profile.cvKey),
    links: [profile.portfolioUrl, profile.linkedinUrl, profile.githubUrl],
    experienceCount: profile.experiences.length,
    educationCount: profile.educations.length,
  });

  return (
    <>
      <PageHeader title="Your profile" description="A complete profile helps companies understand what makes you exceptional." />

      <section aria-labelledby="completeness-heading" className="mb-10 rounded-2xl border bg-card p-5 sm:p-6">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="completeness-heading" className="font-semibold">
            Profile completeness
          </h2>
          <span className="text-2xl font-semibold tabular-nums" data-testid="completeness-percent">
            {completeness.percent}%
          </span>
        </div>
        <Progress value={completeness.percent} className="mt-3 h-2" aria-label="Profile completeness" />
        {completeness.missing.length > 0 ? (
          <ul className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            {completeness.items.map((item) => (
              <li key={item.key} className={item.done ? "flex items-center gap-2 text-muted-foreground line-through" : "flex items-center gap-2"}>
                {item.done ? <CheckCircle2 className="size-4 shrink-0 text-success" /> : <Circle className="size-4 shrink-0 text-muted-foreground" />}
                {item.label}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="size-4 text-success" /> Your profile is complete. Nice work.
          </p>
        )}
      </section>

      <div className="space-y-12">
        <section aria-labelledby="details-heading">
          <h2 id="details-heading" className="mb-4 text-lg font-semibold">
            Details
          </h2>
          <ProfileForm
            defaults={{
              name: user.name ?? "",
              headline: profile.headline ?? "",
              location: profile.location ?? "",
              bio: profile.bio ?? "",
              phone: profile.phone ?? "",
              skills: profile.skills,
              portfolioUrl: profile.portfolioUrl ?? "",
              linkedinUrl: profile.linkedinUrl ?? "",
              githubUrl: profile.githubUrl ?? "",
              visibility: profile.visibility,
            }}
          />
        </section>

        <section aria-labelledby="cv-heading">
          <h2 id="cv-heading" className="mb-4 text-lg font-semibold">
            CV / résumé
          </h2>
          <CvCard fileName={profile.cvKey ? (profile.cvFileName ?? "CV") : null} />
        </section>

        <ExperienceSection
          items={profile.experiences.map((e) => ({
            id: e.id,
            title: e.title,
            company: e.company,
            location: e.location ?? "",
            startDate: month(e.startDate),
            endDate: month(e.endDate),
            description: e.description ?? "",
          }))}
        />
        <EducationSection
          items={profile.educations.map((e) => ({
            id: e.id,
            school: e.school,
            degree: e.degree,
            field: e.field ?? "",
            startYear: e.startYear,
            endYear: e.endYear,
          }))}
        />
      </div>
    </>
  );
}
