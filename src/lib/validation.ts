import { z } from "zod";

export const MAX_PROMPT_CHARS = 50_000;
export const MIN_TOKEN_BUDGET = 1_000;
export const MAX_TOKEN_BUDGET = 1_000_000;
export const DEFAULT_TOKEN_BUDGET = 30_000;

/** `owner/repo` — the only repository identifier accepted from clients. */
export const repositoryNameSchema = z
  .string()
  .regex(
    /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})\/(?!\.{1,2}$)[A-Za-z0-9._-]{1,100}$/,
    "Repository must look like owner/name",
  );

const patternSchema = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .regex(/^[^\u0000-\u001f\\]+$/, "Patterns cannot contain control characters or backslashes");

const patternListSchema = z.array(patternSchema).max(50);

export const promptSchema = z
  .string()
  .max(MAX_PROMPT_CHARS, `Prompt must be at most ${MAX_PROMPT_CHARS.toLocaleString("en-US")} characters`)
  .refine((value) => value.trim().length > 0, "Enter a task prompt");

export const auditRequestSchema = z.strictObject({
  repository: repositoryNameSchema,
  prompt: promptSchema,
  includePatterns: patternListSchema.default([]),
  excludePatterns: patternListSchema.default([]),
  tokenBudget: z.number().int().min(MIN_TOKEN_BUDGET).max(MAX_TOKEN_BUDGET),
  /** Opt-in: count tokens with the Anthropic API using the user's own key. */
  accurate: z.boolean().default(false),
});

export type AuditRequest = z.infer<typeof auditRequestSchema>;

export const anthropicKeySchema = z
  .string()
  .regex(/^sk-ant-[A-Za-z0-9_-]{10,300}$/, "That does not look like an Anthropic API key");

export const auditIdSchema = z.string().regex(/^[a-z0-9]{20,40}$/);
