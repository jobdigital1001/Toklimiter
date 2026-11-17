import { timingSafeEqual } from "node:crypto";
import { runJobAlerts } from "@/lib/alerts";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Invoked daily by Vercel Cron (see vercel.json), which sends `Authorization: Bearer $CRON_SECRET`. */
export async function GET(request: Request) {
  if (!authorized(request)) return new Response("Unauthorized", { status: 401 });
  return Response.json(await runJobAlerts());
}
