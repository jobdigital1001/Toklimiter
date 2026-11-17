import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { publicJobWhere } from "@/lib/jobs";
import { appUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [jobs, companies] = await Promise.all([
    db.job.findMany({ where: publicJobWhere(), select: { slug: true, updatedAt: true }, take: 5000, orderBy: { publishedAt: "desc" } }),
    db.company.findMany({ where: { suspended: false }, select: { slug: true, updatedAt: true }, take: 5000 }),
  ]);
  return [
    { url: appUrl("/"), changeFrequency: "daily", priority: 1 },
    { url: appUrl("/jobs"), changeFrequency: "hourly", priority: 0.9 },
    { url: appUrl("/companies"), changeFrequency: "daily", priority: 0.7 },
    { url: appUrl("/for-companies"), changeFrequency: "monthly", priority: 0.5 },
    ...jobs.map((j) => ({ url: appUrl(`/jobs/${j.slug}`), lastModified: j.updatedAt, priority: 0.8 })),
    ...companies.map((c) => ({ url: appUrl(`/companies/${c.slug}`), lastModified: c.updatedAt, priority: 0.6 })),
  ];
}
