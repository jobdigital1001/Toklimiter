import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, ExternalLink, Lock, Mail, Phone } from "lucide-react";
import { DeleteNoteButton, NoteForm, StatusSelect } from "@/components/recruiter/application-controls";
import { ApplicationStatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { requireRecruiterCompany } from "@/lib/session";
import { formatDate, timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Application" };

function safeHref(url: string | null): string | null {
  return url && /^https?:\/\//i.test(url) ? url : null;
}

export default async function ApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireRecruiterCompany(`/recruiter/applications/${id}`);
  const application = await db.application.findFirst({
    where: { id, job: { companyId: user.companyId } },
    include: {
      job: { select: { id: true, title: true } },
      notes: { orderBy: { createdAt: "desc" }, include: { author: { select: { id: true, name: true } } } },
      user: {
        select: {
          profile: {
            select: { visibility: true, headline: true, location: true, bio: true, skills: true, portfolioUrl: true, linkedinUrl: true, githubUrl: true },
          },
        },
      },
    },
  });
  if (!application) notFound();

  const answers = Array.isArray(application.answers) ? (application.answers as { question: string; answer: string }[]) : [];
  // Applying shares the profile with that company unless the candidate set it to private.
  const profile = application.user.profile?.visibility === "PRIVATE" ? null : application.user.profile;
  const link = safeHref(application.linkUrl);
  const profileLinks = [
    { label: "Portfolio", href: safeHref(profile?.portfolioUrl ?? null) },
    { label: "LinkedIn", href: safeHref(profile?.linkedinUrl ?? null) },
    { label: "GitHub", href: safeHref(profile?.githubUrl ?? null) },
  ].filter((l): l is { label: string; href: string } => Boolean(l.href));

  return (
    <>
      <Link
        href={`/recruiter/jobs/${application.job.id}/applications`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> {application.job.title}
      </Link>

      <header className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">{application.fullName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Applied for {application.job.title} on {formatDate(application.createdAt)}
          </p>
        </div>
        <ApplicationStatusBadge status={application.status} className="self-start" />
      </header>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="min-w-0 space-y-8">
          <section aria-labelledby="contact-heading" className="rounded-2xl border bg-card p-5">
            <h2 id="contact-heading" className="mb-3 font-semibold">
              Contact
            </h2>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Mail className="size-4 text-muted-foreground" />
                <a href={`mailto:${application.email}`} className="underline-offset-4 hover:underline">
                  {application.email}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="size-4 text-muted-foreground" />
                <a href={`tel:${application.phone.replace(/[^+\d]/g, "")}`} className="underline-offset-4 hover:underline">
                  {application.phone}
                </a>
              </li>
              {link && (
                <li className="flex items-center gap-2">
                  <ExternalLink className="size-4 text-muted-foreground" />
                  <a href={link} target="_blank" rel="noopener noreferrer nofollow" className="truncate text-primary underline-offset-4 hover:underline">
                    {link}
                  </a>
                </li>
              )}
            </ul>
            {application.cvKey && (
              <Button asChild className="mt-4">
                <a href={`/api/cv/application/${application.id}`} download>
                  <Download /> Download CV
                </a>
              </Button>
            )}
          </section>

          {application.coverLetter && (
            <section aria-labelledby="cover-heading">
              <h2 id="cover-heading" className="font-semibold">
                Cover letter
              </h2>
              <p className="prose-plain mt-3">{application.coverLetter}</p>
            </section>
          )}

          {answers.length > 0 && (
            <section aria-labelledby="answers-heading">
              <h2 id="answers-heading" className="font-semibold">
                Screening answers
              </h2>
              <dl className="mt-3 space-y-4">
                {answers.map((a, i) => (
                  <div key={i} className="rounded-xl bg-muted/50 p-4">
                    <dt className="text-sm font-medium">{a.question}</dt>
                    <dd className="mt-1.5 text-sm leading-6 whitespace-pre-line text-foreground/85">{a.answer}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          <section aria-labelledby="profile-heading">
            <h2 id="profile-heading" className="font-semibold">
              Candidate profile
            </h2>
            {!profile ? (
              <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <Lock className="size-4" /> This candidate keeps their profile private.
              </p>
            ) : (
              <div className="mt-3 space-y-3 text-sm">
                {(profile.headline || profile.location) && (
                  <p className="text-muted-foreground">{[profile.headline, profile.location].filter(Boolean).join(" · ")}</p>
                )}
                {profile.bio && <p className="leading-6 whitespace-pre-line text-foreground/85">{profile.bio}</p>}
                {profile.skills.length > 0 && (
                  <ul className="flex flex-wrap gap-1.5">
                    {profile.skills.map((s) => (
                      <li key={s}>
                        <Badge variant="secondary">{s}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
                {profileLinks.length > 0 && (
                  <ul className="flex flex-wrap gap-4">
                    {profileLinks.map((l) => (
                      <li key={l.label}>
                        <a href={l.href} target="_blank" rel="noopener noreferrer nofollow" className="text-primary underline-offset-4 hover:underline">
                          {l.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
                {!profile.headline && !profile.bio && profile.skills.length === 0 && profileLinks.length === 0 && (
                  <p className="text-muted-foreground">This candidate hasn’t filled in their profile yet.</p>
                )}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section aria-label="Status" className="rounded-2xl border bg-card p-5">
            <StatusSelect applicationId={application.id} status={application.status} />
          </section>
          <section aria-labelledby="notes-heading" className="rounded-2xl border bg-card p-5">
            <h2 id="notes-heading" className="mb-4 flex items-center gap-2 font-semibold">
              <Lock className="size-4 text-muted-foreground" /> Private notes
            </h2>
            <NoteForm applicationId={application.id} />
            {application.notes.length > 0 && (
              <ul className="mt-5 space-y-4 border-t pt-5">
                {application.notes.map((note) => (
                  <li key={note.id}>
                    <p className="text-sm leading-6 whitespace-pre-line">{note.body}</p>
                    <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      {note.author?.name ?? "Former teammate"} · {timeAgo(note.createdAt)}
                      {note.author?.id === user.id && <DeleteNoteButton noteId={note.id} />}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
