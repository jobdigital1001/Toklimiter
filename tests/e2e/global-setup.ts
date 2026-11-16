import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { PrismaClient } from "@prisma/client";
import { encode } from "next-auth/jwt";
import { encryptSecret } from "../../src/lib/crypto";
import { MOCK_GITHUB_TOKEN, TEST_ENV, USERS } from "./env";

/**
 * Prepares the test database and signs test users in by minting the same
 * encrypted session cookie NextAuth would issue after GitHub OAuth. The app
 * itself has no test-only login path.
 */
export default async function globalSetup() {
  execSync("npx prisma migrate deploy", { env: { ...process.env, ...TEST_ENV }, stdio: "pipe" });

  const prisma = new PrismaClient({ datasources: { db: { url: TEST_ENV.DATABASE_URL } } });
  try {
    await prisma.user.deleteMany();
    for (const user of Object.values(USERS)) {
      await prisma.user.create({
        data: {
          id: user.id,
          githubId: user.githubId,
          name: user.name,
          encryptedAccessToken: encryptSecret(MOCK_GITHUB_TOKEN, TEST_ENV.TOKEN_ENCRYPTION_KEY),
        },
      });
      const token = await encode({
        token: { name: user.name, sub: user.githubId, uid: user.id },
        secret: TEST_ENV.NEXTAUTH_SECRET,
      });
      mkdirSync(dirname(user.state), { recursive: true });
      writeFileSync(
        user.state,
        JSON.stringify({
          cookies: [
            {
              name: "next-auth.session-token",
              value: token,
              domain: "localhost",
              path: "/",
              expires: Math.floor(Date.now() / 1000) + 3600,
              httpOnly: true,
              secure: false,
              sameSite: "Lax",
            },
          ],
          origins: [],
        }),
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}
