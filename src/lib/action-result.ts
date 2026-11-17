import type { z } from "zod";

export type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export function ok(): ActionResult<undefined>;
export function ok<T>(data: T, message?: string): ActionResult<T>;
export function ok<T>(data?: T, message?: string) {
  return { ok: true, data, message } as ActionResult<T>;
}

export function fail(error: string, fieldErrors?: Record<string, string>): { ok: false; error: string; fieldErrors?: Record<string, string> } {
  return { ok: false, error, fieldErrors };
}

export function invalid(error: z.ZodError) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fail("Please fix the highlighted fields.", fieldErrors);
}

export const UNAUTHORIZED = fail("You don’t have permission to do that. Please sign in again.");
