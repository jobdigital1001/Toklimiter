import type { Metadata } from "next";
import { saveTemplateAction } from "@/actions/recruiter";
import { PageHeader } from "@/components/page-header";
import { TemplateForm } from "@/components/template-form";
import { db } from "@/lib/db";
import { templateDefaults } from "@/lib/recruiter";
import { requireRecruiterCompany } from "@/lib/session";

export const metadata: Metadata = { title: "New template" };

export default async function NewTemplatePage() {
  await requireRecruiterCompany("/recruiter/templates/new");
  const categories = await db.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
  return (
    <>
      <PageHeader title="New template" description="Save the parts of a role you reuse. You’ll tailor the rest for each job." />
      <TemplateForm defaults={templateDefaults()} categories={categories} save={saveTemplateAction.bind(null, null)} returnTo="/recruiter/templates" />
    </>
  );
}
