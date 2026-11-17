import type { Metadata } from "next";
import { saveSystemTemplateAction } from "@/actions/admin";
import { PageHeader } from "@/components/page-header";
import { TemplateForm } from "@/components/template-form";
import { db } from "@/lib/db";
import { templateDefaults } from "@/lib/recruiter";
import { requireRole } from "@/lib/session";

export const metadata: Metadata = { title: "New template" };

export default async function AdminNewTemplatePage() {
  await requireRole("ADMIN", "/admin/templates/new");
  const categories = await db.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
  return (
    <>
      <PageHeader title="New built-in template" />
      <TemplateForm defaults={templateDefaults()} categories={categories} save={saveSystemTemplateAction.bind(null, null)} returnTo="/admin/templates" />
    </>
  );
}
