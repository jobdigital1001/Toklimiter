import "server-only";
import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 },
  pages: { signIn: "/", error: "/" },
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID ?? "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
      // Minimum scope by default: identity only (public repositories).
      // GitHub Apps ignore scopes and use their fine-grained permissions instead.
      authorization: { params: { scope: process.env.GITHUB_OAUTH_SCOPE ?? "read:user" } },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      // Runs with `account` only on sign-in. The GitHub token is encrypted and
      // stored server-side; it is never placed in the session cookie.
      if (account?.provider === "github" && account.access_token) {
        const githubId = String(account.providerAccountId);
        const data = {
          name: (profile?.name ?? token.name ?? null) as string | null,
          email: (profile?.email ?? token.email ?? null) as string | null,
          encryptedAccessToken: encryptSecret(account.access_token),
        };
        const user = await prisma.user.upsert({
          where: { githubId },
          update: data,
          create: { githubId, ...data },
        });
        token.uid = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && typeof token.uid === "string") session.user.id = token.uid;
      return session;
    },
  },
};

export interface CurrentUser {
  id: string;
  name: string | null;
}

/** Returns the signed-in user, or null. The single place sessions are read. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await getServerSession(authOptions);
  const id = session?.user?.id;
  if (!id) return null;
  return { id, name: session.user?.name ?? null };
}

/** Decrypts the stored GitHub token for a user. Returns null if missing/unreadable. */
export async function getGitHubToken(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { encryptedAccessToken: true },
  });
  if (!user?.encryptedAccessToken) return null;
  try {
    return decryptSecret(user.encryptedAccessToken);
  } catch {
    return null;
  }
}
