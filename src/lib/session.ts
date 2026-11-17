import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import type { Role } from "@/generated/prisma/enums";

export type CurrentUser = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: Role;
  companyId: string | null;
  onboardedAt: Date | null;
};

/**
 * Resolves the signed-in user from the database on every request, so role changes
 * and suspensions take effect immediately rather than when the JWT expires.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      status: true,
      companyId: true,
      onboardedAt: true,
    },
  });
  if (!user || user.status !== "ACTIVE") return null;
  return user;
});

export async function requireUser(next?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/sign-in${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  if (!user.onboardedAt) redirect("/onboarding");
  return user;
}

export function homeForRole(role: Role): string {
  if (role === "ADMIN") return "/admin";
  if (role === "RECRUITER") return "/recruiter";
  return "/account";
}

export async function requireRole(role: Role, next?: string): Promise<CurrentUser> {
  const user = await requireUser(next);
  if (user.role !== role) redirect(homeForRole(user.role));
  return user;
}

/** Recruiter with a company profile; redirects to company setup otherwise. */
export async function requireRecruiterCompany(next?: string): Promise<CurrentUser & { companyId: string }> {
  const user = await requireRole("RECRUITER", next);
  if (!user.companyId) redirect("/recruiter/company?setup=1");
  return user as CurrentUser & { companyId: string };
}

/* ── Variants for server actions: return null instead of redirecting ── */

export async function actionUser(role?: Role): Promise<CurrentUser | null> {
  const user = await getCurrentUser();
  if (!user || !user.onboardedAt) return null;
  if (role && user.role !== role) return null;
  return user;
}
