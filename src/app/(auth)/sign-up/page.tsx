import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { oauthProviders } from "@/auth";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { getCurrentUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { safeRedirect } from "@/lib/utils";

export const metadata: Metadata = { title: "Create account" };

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ next?: string; role?: string }> }) {
  const { next: rawNext, role } = await searchParams;
  const next = rawNext ? safeRedirect(rawNext, "/dashboard") : undefined;
  if (await getCurrentUser()) redirect(next ?? "/dashboard");
  const settings = await getSettings();
  return (
    <div className="w-full max-w-md animate-rise rounded-2xl border bg-card p-6 shadow-xl shadow-primary/5 sm:p-8">
      <h1 className="text-2xl font-semibold">Create your account</h1>
      <p className="mt-1.5 mb-6 text-sm text-muted-foreground">Free for candidates. Set up in under a minute.</p>
      {settings.allowRegistrations ? (
        <>
          <OAuthButtons providers={oauthProviders} next={next} />
          <SignUpForm next={next} defaultRole={role === "recruiter" ? "RECRUITER" : "CANDIDATE"} />
        </>
      ) : (
        <p role="status" className="rounded-lg border bg-muted p-4 text-sm">
          New registrations are temporarily closed. Please check back soon.
        </p>
      )}
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href={`/sign-in${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-medium text-primary underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
      <p className="mt-4 text-center text-xs text-muted-foreground">
        By creating an account you agree to our{" "}
        <Link href="/legal/terms" className="underline underline-offset-2">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/legal/privacy" className="underline underline-offset-2">
          Privacy summary
        </Link>
        .
      </p>
    </div>
  );
}
