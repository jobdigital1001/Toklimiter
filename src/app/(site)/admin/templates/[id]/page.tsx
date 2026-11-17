import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { saveSystemTemplateAction } from "@/actions/admin";
import { PageHeader } from "@/components/page-header";
import { TemplateForm } from "@/components/template-form";
import { db } from "@/lib/db";
import { templateDefaults } from "@/lib/recruiter";
import { requireRole } from "@/lib/session";

export const metadata: Metadata = { title: "Edit template" };

export default async function AdminEditTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireRole("ADMIN", `/admin/templates/${id}`);
  const [template, categories] = await Promise.all([
    db.jobTemplate.findFirst({ where: { id, isSystem: true } }),
    db.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!template) notFound();
  return (
    <>
      <PageHeader title="Edit built-in template" />
      <TemplateForm
        defaults={templateDefaults(template)}
        categories={categories}
        save={saveSystemTemplateAction.bind(null, template.id)}
        returnTo="/admin/templates"
      />
    </>
  );
}
