import type { Metadata } from "next";
import { SettingsForm } from "@/components/admin/controls";
import { PageHeader } from "@/components/page-header";
import { requireRole } from "@/lib/session";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Platform settings" };

export default async function AdminSettingsPage() {
  await requireRole("ADMIN", "/admin/settings");
  return (
    <>
      <PageHeader title="Platform settings" description="Changes apply across the site immediately." />
      <SettingsForm defaults={await getSettings()} />
    </>
  );
}
