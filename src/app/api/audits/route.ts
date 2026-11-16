import { createAnthropicCounter } from "@/lib/anthropic";
import { githubErrorResponse, jsonError, requireGitHubUser } from "@/lib/api";
import { computeAudit } from "@/lib/audit";
import { saveAudit } from "@/lib/audit-store";
import { createGitHubClient, GitHubError } from "@/lib/github";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { anthropicKeySchema, auditRequestSchema } from "@/lib/validation";

// Scanning a large repository can take a while on serverless platforms.
export const maxDuration = 60;

const MAX_BODY_BYTES = 256_000;

export async function POST(request: Request) {
  const auth = await requireGitHubUser();
  if ("response" in auth) return auth.response;

  const limit = rateLimit(`audits:${auth.user.id}`, 10, 60_000);
  if (!limit.ok) return tooManyRequests(limit);

  const raw = await request.text().catch(() => "");
  if (raw.length > MAX_BODY_BYTES) return jsonError(413, "Request is too large.");
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return jsonError(400, "Request body must be valid JSON.");
  }
  const parsed = auditRequestSchema.safeParse(json);
  if (!parsed.success) {
    return jsonError(400, parsed.error.issues[0]?.message ?? "Invalid request.", {
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }
  const input = parsed.data;

  // Repository contents go to Anthropic only on explicit opt-in with the user's own key.
  let countTokens;
  if (input.accurate) {
    const key = anthropicKeySchema.safeParse(request.headers.get("x-anthropic-api-key"));
    if (!key.success) {
      return jsonError(400, "Accurate counting is on, but no valid Anthropic API key was provided. Check Settings.");
    }
    countTokens = createAnthropicCounter(key.data);
  }

  try {
    const result = await computeAudit(input, {
      github: createGitHubClient(auth.token),
      countTokens,
    });
    const audit = await saveAudit(auth.user.id, input, result);
    return Response.json({ audit, estimator: result.estimator, warnings: result.warnings });
  } catch (error) {
    if (error instanceof GitHubError) return githubErrorResponse(error);
    console.error("Audit failed:", error instanceof Error ? error.name : "unknown error");
    return jsonError(500, "The audit could not be completed. Try again.");
  }
}
