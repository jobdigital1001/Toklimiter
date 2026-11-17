import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Building2, UserRound } from "lucide-react";
import { completeOnboardingAction } from "@/actions/auth";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Choose your account type" };

const OPTIONS = [
  { role: "CANDIDATE", title: "I’m looking for work", detail: "Build a profile, save jobs, apply, and track applications.", icon: UserRound },
  { role: "RECRUITER", title: "I’m hiring", detail: "Create a company profile, post jobs, and review applicants.", icon: Building2 },
];

/** Shown once to users who signed up with OAuth, since the provider can't tell us their account type. */
export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (user.onboardedAt) redirect("/dashboard");
  return (
    <div className="w-full max-w-lg animate-rise rounded-2xl border bg-card p-6 shadow-xl shadow-primary/5 sm:p-8">
      <h1 className="text-2xl font-semibold">How will you use Genius?</h1>
      <p className="mt-1.5 mb-6 text-sm text-muted-foreground">Choose one to finish setting up your account.</p>
      <div className="grid gap-3">
        {OPTIONS.map((o) => (
          <form key={o.role} action={completeOnboardingAction}>
            <input type="hidden" name="role" value={o.role} />
            <button
              type="submit"
              className="flex w-full items-start gap-4 rounded-xl border p-4 text-left transition-colors hover:border-primary hover:bg-accent/50"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <o.icon className="size-5" />
              </span>
              <span>
                <span className="block font-medium">{o.title}</span>
                <span className="mt-0.5 block text-sm text-muted-foreground">{o.detail}</span>
              </span>
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}
