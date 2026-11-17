import type { Metadata } from "next";
import { AlertsManager, type AlertItem } from "@/components/account/alerts-manager";
import { PageHeader } from "@/components/page-header";
import { ARRANGEMENT_LABELS, EMPLOYMENT_TYPE_LABELS, EXPERIENCE_LEVEL_LABELS } from "@/lib/constants";
import { db } from "@/lib/db";
import { filtersToQuery } from "@/lib/search";
import { requireRole } from "@/lib/session";

export const metadata: Metadata = { title: "Job alerts" };

export default async function AlertsPage() {
  const user = await requireRole("CANDIDATE", "/account/alerts");
  const [alerts, categories] = await Promise.all([
    db.jobAlert.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, include: { category: { select: { name: true, slug: true } } } }),
    db.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const items: AlertItem[] = alerts.map((a) => ({
    id: a.id,
    active: a.active,
    name: a.name,
    q: a.q ?? "",
    location: a.location ?? "",
    categoryId: a.categoryId ?? "",
    arrangement: a.arrangement ?? "",
    employmentType: a.employmentType ?? "",
    experienceLevel: a.experienceLevel ?? "",
    salaryMin: a.salaryMin,
    frequency: a.frequency,
    summary: [
      a.q && `“${a.q}”`,
      a.location,
      a.category?.name,
      a.arrangement && ARRANGEMENT_LABELS[a.arrangement],
      a.employmentType && EMPLOYMENT_TYPE_LABELS[a.employmentType],
      a.experienceLevel && EXPERIENCE_LEVEL_LABELS[a.experienceLevel],
      a.salaryMin && `$${Math.round(a.salaryMin / 1000)}k+`,
    ].filter((s): s is string => Boolean(s)),
    searchHref: `/jobs${filtersToQuery({
      q: a.q ?? "",
      location: a.location ?? "",
      category: a.category?.slug ?? "",
      arrangement: a.arrangement ?? "",
      type: a.employmentType ?? "",
      level: a.experienceLevel ?? "",
      salaryMin: a.salaryMin,
    })}`,
  }));

  return (
    <>
      <PageHeader title="Job alerts" description="Saved searches that email you when new matching roles are published." />
      <AlertsManager alerts={items} categories={categories} />
    </>
  );
}
