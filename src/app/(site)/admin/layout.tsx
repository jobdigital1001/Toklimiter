import { DashboardShell, SectionNav } from "@/components/section-nav";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole("ADMIN", "/admin");
  const openReports = await db.report.count({ where: { status: "OPEN" } });
  const nav = [
    { href: "/admin", label: "Overview", exact: true },
    { href: "/admin/users", label: "Users" },
    { href: "/admin/companies", label: "Companies" },
    { href: "/admin/jobs", label: "Jobs" },
    { href: "/admin/categories", label: "Categories" },
    { href: "/admin/templates", label: "Templates" },
    { href: "/admin/reports", label: "Reports", badge: openReports },
    { href: "/admin/settings", label: "Settings" },
  ];
  return <DashboardShell nav={<SectionNav items={nav} label="Admin" />}>{children}</DashboardShell>;
}
