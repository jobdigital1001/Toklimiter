import { DashboardShell, SectionNav } from "@/components/section-nav";
import { requireRole } from "@/lib/session";

const NAV = [
  { href: "/recruiter", label: "Dashboard", exact: true },
  { href: "/recruiter/jobs", label: "Jobs" },
  { href: "/recruiter/templates", label: "Templates" },
  { href: "/recruiter/company", label: "Company profile" },
];

export default async function RecruiterLayout({ children }: { children: React.ReactNode }) {
  await requireRole("RECRUITER", "/recruiter");
  return <DashboardShell nav={<SectionNav items={NAV} label="Recruiter" />}>{children}</DashboardShell>;
}
