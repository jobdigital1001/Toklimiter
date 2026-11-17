"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { signIn, signOut, oauthProviders } from "@/auth";
import { db } from "@/lib/db";
import { fail, invalid, ok, type ActionResult } from "@/lib/action-result";
import { sendWelcomeEmail } from "@/lib/email";
import { getCurrentUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { safeRedirect } from "@/lib/utils";
import { signInSchema, signUpSchema, type SignInInput, type SignUpInput } from "@/lib/validation";

export async function signUpAction(input: SignUpInput, next?: string): Promise<ActionResult<{ redirectTo: string }>> {
  const settings = await getSettings();
  if (!settings.allowRegistrations) return fail("New registrations are temporarily closed.");

  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { name, email, password, role } = parsed.data;

  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return fail("An account with this email already exists.", { email: "Try signing in instead." });

  const passwordHash = await bcrypt.hash(password, 12);
  await db.user.create({
    data: {
      name,
      email,
      passwordHash,
      role,
      onboardedAt: new Date(),
      ...(role === "CANDIDATE" ? { profile: { create: {} } } : {}),
    },
  });
  await sendWelcomeEmail(email, name, role);

  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch {
    return fail("Your account was created, but we couldn’t sign you in. Please sign in manually.");
  }
  const fallback = role === "RECRUITER" ? "/recruiter/company?setup=1" : "/account";
  return ok({ redirectTo: role === "CANDIDATE" ? safeRedirect(next, fallback) : fallback });
}

export async function signInAction(input: SignInInput, next?: string): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  try {
    await signIn("credentials", { ...parsed.data, redirect: false });
  } catch (error) {
    if (error instanceof AuthError) return fail("Incorrect email or password.");
    throw error;
  }
  return ok({ redirectTo: safeRedirect(next, "/dashboard") });
}

export async function oauthSignInAction(formData: FormData) {
  const provider = String(formData.get("provider"));
  if ((provider !== "github" && provider !== "google") || !oauthProviders[provider]) return;
  await signIn(provider, { redirectTo: safeRedirect(String(formData.get("next") ?? ""), "/dashboard") });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}

export async function completeOnboardingAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (user.onboardedAt) redirect("/dashboard");
  const role = formData.get("role") === "RECRUITER" ? "RECRUITER" : "CANDIDATE";
  await db.user.update({
    where: { id: user.id },
    data: {
      role,
      onboardedAt: new Date(),
      ...(role === "CANDIDATE" ? { profile: { connectOrCreate: { where: { userId: user.id }, create: {} } } } : {}),
    },
  });
  await sendWelcomeEmail(user.email, user.name ?? "there", role);
  redirect(role === "RECRUITER" ? "/recruiter/company?setup=1" : "/account");
}
