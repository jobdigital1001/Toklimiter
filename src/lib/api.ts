import "server-only";
import { getCurrentUser, getGitHubToken, type CurrentUser } from "@/lib/auth";
import { GitHubError } from "@/lib/github";

export function jsonError(status: number, error: string, extra?: Record<string, unknown>) {
  return Response.json({ error, ...extra }, { status });
}

export const unauthorized = () => jsonError(401, "Sign in to continue.");

/** Resolves the signed-in user and their decrypted GitHub token, or a 401 response. */
export async function requireGitHubUser(): Promise<
  { user: CurrentUser; token: string } | { response: Response }
> {
  const user = await getCurrentUser();
  if (!user) return { response: unauthorized() };
  const token = await getGitHubToken(user.id);
  if (!token) {
    return { response: jsonError(401, "Your GitHub connection has expired. Sign in again.") };
  }
  return { user, token };
}

/** Maps upstream GitHub failures to safe client responses (no upstream detail leaked). */
export function githubErrorResponse(error: unknown): Response {
  if (error instanceof GitHubError) {
    if (error.status === 401) {
      return jsonError(401, "Your GitHub connection has expired. Sign in again.");
    }
    if (error.status === 403 || error.status === 404) {
      return jsonError(404, "Repository not found, or access to it has not been granted.");
    }
    if (error.status === 429) {
      return jsonError(429, "GitHub rate limit reached. Try again in a few minutes.");
    }
    if (error.status === 409) {
      return jsonError(422, "This repository is empty.");
    }
  }
  return jsonError(502, "GitHub could not be reached. Try again.");
}
