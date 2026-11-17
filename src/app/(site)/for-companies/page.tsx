import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, FileStack, ListChecks, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "For companies",
  description: "Publish roles, review applicants, and measure results on Genius JobPortal.",
};

const FEATURES = [
  { icon: FileStack, title: "Start from a template", body: "Eight role templates cover the common hires. Save your own for roles you post often." },
  { icon: ListChecks, title: "Preview, then publish", body: "See exactly what candidates will see. Pause, unpause, or close a role whenever you need." },
  { icon: Users, title: "One clear pipeline", body: "Move applicants from Submitted to Offer, download CVs, and keep private notes for your team." },
  { icon: BarChart3, title: "Know what’s working", body: "Track views, applications, and conversion rate for every role you publish." },
];

const STEPS = [
  { title: "Create your company profile", body: "Tell candidates who you are, how you work, and what you’re building." },
  { title: "Publish your first role", body: "Pick a template, tailor it, add screening questions, and preview before going live." },
  { title: "Review and decide", body: "Applications arrive in your dashboard with everything you need to move quickly." },
];

export default function ForCompaniesPage() {
  return (
    <div className="container-page py-14 sm:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-medium text-primary">For companies</p>
        <h1 className="mt-3 text-4xl font-semibold sm:text-5xl">Hire exceptional people, without the busywork.</h1>
        <p className="mt-5 text-lg leading-8 text-muted-foreground">
          Genius JobPortal gives innovative teams a focused place to publish roles and run a tidy hiring pipeline.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/sign-up?role=recruiter">Create a recruiter account</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/recruiter/jobs/new">Post a job</Link>
          </Button>
        </div>
      </div>

      <ul className="mt-16 grid gap-4 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <li key={f.title} className="rounded-2xl border bg-card p-6">
            <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <f.icon className="size-5" />
            </span>
            <h2 className="mt-4 text-lg font-semibold">{f.title}</h2>
            <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{f.body}</p>
          </li>
        ))}
      </ul>

      <section aria-labelledby="how-heading" className="mt-20">
        <h2 id="how-heading" className="text-center text-3xl font-semibold">
          Live in three steps
        </h2>
        <ol className="mt-8 grid gap-4 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="rounded-2xl bg-muted/50 p-6">
              <span className="font-mono text-sm text-primary">0{i + 1}</span>
              <h3 className="mt-2 font-semibold">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
