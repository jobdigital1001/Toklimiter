import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { oauthProviders } from "@/auth";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { SignInForm } from "@/components/auth/sign-in-form";
import { getCurrentUser } from "@/lib/session";
import { safeRedirect } from "@/lib/utils";

export const metadata: Metadata = { title: "Sign in" };

const ERRORS: Record<string, string> = {
  OAuthAccountNotLinked: "That email is already registered with a different sign-in method. Use your original method.",
  AccessDenied: "Access denied. Your account may be suspended.",
};

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next: rawNext, error } = await searchParams;
  const next = rawNext ? safeRedirect(rawNext, "/dashboard") : undefined;
  if (await getCurrentUser()) redirect(next ?? "/dashboard");
  return (
    <div className="w-full max-w-md animate-rise rounded-2xl border bg-card p-6 shadow-xl shadow-primary/5 sm:p-8">
      <h1 className="text-2xl font-semibold">Welcome back</h1>
      <p className="mt-1.5 mb-6 text-sm text-muted-foreground">Sign in to continue to your account.</p>
      {error && (
        <p role="alert" className="mb-5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {ERRORS[error] ?? "We couldn’t sign you in. Please try again."}
        </p>
      )}
      <OAuthButtons providers={oauthProviders} next={next} />
      <SignInForm next={next} />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link href={`/sign-up${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-medium text-primary underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
