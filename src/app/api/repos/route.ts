import { githubErrorResponse, requireGitHubUser } from "@/lib/api";
import { createGitHubClient } from "@/lib/github";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

export async function GET() {
  const auth = await requireGitHubUser();
  if ("response" in auth) return auth.response;

  const limit = rateLimit(`repos:${auth.user.id}`, 30, 60_000);
  if (!limit.ok) return tooManyRequests(limit);

  try {
    const repos = await createGitHubClient(auth.token).listRepos();
    return Response.json({ repos });
  } catch (error) {
    return githubErrorResponse(error);
  }
}
