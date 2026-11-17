import "server-only";
import { db } from "@/lib/db";
import { sendJobAlertEmail } from "@/lib/email";
import { buildJobWhere } from "@/lib/jobs";
import { filtersToQuery } from "@/lib/search";
import { appUrl } from "@/lib/utils";

const DAY = 86_400_000;

export function isAlertDue(alert: { frequency: "DAILY" | "WEEKLY"; lastSentAt: Date | null; createdAt: Date }, now: Date): boolean {
  const since = alert.lastSentAt ?? alert.createdAt;
  // One hour of slack so a cron that fires slightly early doesn't skip a whole cycle.
  const interval = (alert.frequency === "DAILY" ? DAY : 7 * DAY) - 3_600_000;
  return now.getTime() - since.getTime() >= interval;
}

/** Sends one email per due alert that has new matching jobs since it was last checked. */
export async function runJobAlerts(now: Date = new Date(), limit = 500) {
  const alerts = await db.jobAlert.findMany({
    where: { active: true, user: { status: "ACTIVE" } },
    orderBy: { lastSentAt: { sort: "asc", nulls: "first" } },
    take: limit,
    include: { user: { select: { email: true } }, category: { select: { slug: true } } },
  });

  let checked = 0;
  let sent = 0;
  for (const alert of alerts) {
    if (!isAlertDue(alert, now)) continue;
    checked++;
    const since = alert.lastSentAt ?? alert.createdAt;
    const criteria = {
      q: alert.q ?? "",
      location: alert.location ?? "",
      arrangement: alert.arrangement ?? ("" as const),
      type: alert.employmentType ?? ("" as const),
      level: alert.experienceLevel ?? ("" as const),
      salaryMin: alert.salaryMin,
    };
    const jobs = await db.job.findMany({
      where: { AND: [buildJobWhere({ ...criteria, categoryId: alert.categoryId }), { publishedAt: { gt: since } }] },
      orderBy: { publishedAt: "desc" },
      take: 10,
      select: { title: true, slug: true, location: true, company: { select: { name: true } } },
    });
    if (jobs.length > 0) {
      await sendJobAlertEmail(alert.user.email, {
        alertName: alert.name,
        jobs: jobs.map((j) => ({ title: j.title, slug: j.slug, location: j.location, company: j.company.name })),
        searchUrl: appUrl(`/jobs${filtersToQuery({ ...criteria, category: alert.category?.slug ?? "" })}`),
      });
      sent++;
    }
    await db.jobAlert.update({ where: { id: alert.id }, data: { lastSentAt: now } });
  }
  return { checked, sent };
}
