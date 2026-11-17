import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { signInSchema } from "@/lib/validation";

export const oauthProviders = {
  github: Boolean(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET),
  google: Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET),
};

// Compared against when the account does not exist, to keep response timing uniform.
const DUMMY_HASH = "$2b$12$CwTycUXWue0Thq9StjUM0uJ8rP1rQmWvQk0ZyqV2R3dQ7bq7a7O1K";

const providers: Provider[] = [
  Credentials({
    credentials: { email: {}, password: {} },
    async authorize(raw) {
      const parsed = signInSchema.safeParse(raw);
      if (!parsed.success) return null;
      const user = await db.user.findUnique({ where: { email: parsed.data.email } });
      const valid = await bcrypt.compare(parsed.data.password, user?.passwordHash ?? DUMMY_HASH);
      if (!user || !user.passwordHash || !valid || user.status !== "ACTIVE") return null;
      return { id: user.id, name: user.name, email: user.email, image: user.image };
    },
  }),
];
if (oauthProviders.github) providers.push(GitHub);
if (oauthProviders.google) providers.push(Google);

export const { handlers, auth, signIn, signOut } = NextAuth({
  // The generated Prisma client is structurally compatible with the adapter's expected client.
  adapter: PrismaAdapter(db as unknown as Parameters<typeof PrismaAdapter>[0]),
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  pages: { signIn: "/sign-in", error: "/sign-in" },
  providers,
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      const existing = await db.user.findUnique({
        where: { email: user.email.toLowerCase() },
        select: { status: true },
      });
      return existing?.status !== "SUSPENDED";
    },
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
