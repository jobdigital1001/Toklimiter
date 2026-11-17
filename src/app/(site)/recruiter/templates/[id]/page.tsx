import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { saveTemplateAction } from "@/actions/recruiter";
import { PageHeader } from "@/components/page-header";
import { TemplateForm } from "@/components/template-form";
import { db } from "@/lib/db";
import { templateDefaults } from "@/lib/recruiter";
import { requireRecruiterCompany } from "@/lib/session";

export const metadata: Metadata = { title: "Edit template" };

export default async function EditTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireRecruiterCompany(`/recruiter/templates/${id}`);
  const [template, categories] = await Promise.all([
    db.jobTemplate.findFirst({ where: { id, companyId: user.companyId, isSystem: false } }),
    db.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!template) notFound();
  return (
    <>
      <PageHeader title="Edit template" />
      <TemplateForm
        defaults={templateDefaults(template)}
        categories={categories}
        save={saveTemplateAction.bind(null, template.id)}
        returnTo="/recruiter/templates"
      />
    </>
  );
}
