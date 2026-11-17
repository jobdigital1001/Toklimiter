import { DashboardShell, SectionNav } from "@/components/section-nav";
import { requireRole } from "@/lib/session";

const NAV = [
  { href: "/account", label: "Profile", exact: true },
  { href: "/account/applications", label: "Applications" },
  { href: "/account/saved", label: "Saved jobs" },
  { href: "/account/alerts", label: "Job alerts" },
];

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  await requireRole("CANDIDATE", "/account");
  return <DashboardShell nav={<SectionNav items={NAV} label="Account" />}>{children}</DashboardShell>;
}
