import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, FilePlus2 } from "lucide-react";
import { CategoryIcon } from "@/components/category-icon";
import { PageHeader } from "@/components/page-header";
import { JobForm } from "@/components/recruiter/job-form";
import { db } from "@/lib/db";
import { EMPTY_JOB, jobDefaultsFromTemplate } from "@/lib/recruiter";
import { requireRecruiterCompany } from "@/lib/session";

export const metadata: Metadata = { title: "New job" };

export default async function NewJobPage({ searchParams }: { searchParams: Promise<{ template?: string }> }) {
  const user = await requireRecruiterCompany("/recruiter/jobs/new");
  const { template: templateId } = await searchParams;

  if (!templateId) {
    const templates = await db.jobTemplate.findMany({
      where: { OR: [{ isSystem: true }, { companyId: user.companyId }] },
      orderBy: [{ isSystem: "desc" }, { name: "asc" }],
      select: { id: true, name: true, isSystem: true, title: true, category: { select: { icon: true } } },
    });
    const card = "flex h-full items-start gap-3.5 rounded-2xl border bg-card p-4 card-lift";
    return (
      <>
        <PageHeader title="Start with a template" description="Templates pre-fill the role so you only tailor the details. You can change everything." />
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {templates.map((t) => (
            <li key={t.id}>
              <Link href={`/recruiter/jobs/new?template=${t.id}`} className={card}>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <CategoryIcon name={t.category?.icon ?? "briefcase"} className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block font-medium">{t.name}</span>
                  <span className="block truncate text-sm text-muted-foreground">{t.isSystem ? t.title : "Your template"}</span>
                </span>
              </Link>
            </li>
          ))}
          <li>
            <Link href="/recruiter/jobs/new?template=blank" className={`${card} border-dashed`}>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <FilePlus2 className="size-5" />
              </span>
              <span>
                <span className="block font-medium">Custom template</span>
                <span className="block text-sm text-muted-foreground">Start from a blank job</span>
              </span>
            </Link>
          </li>
        </ul>
        <p className="mt-6 text-sm text-muted-foreground">
          Post similar roles often?{" "}
          <Link href="/recruiter/templates" className="font-medium text-primary underline-offset-4 hover:underline">
            Create your own reusable template
          </Link>
          .
        </p>
      </>
    );
  }

  const [template, categories] = await Promise.all([
    templateId === "blank"
      ? null
      : db.jobTemplate.findFirst({ where: { id: templateId, OR: [{ isSystem: true }, { companyId: user.companyId }] } }),
    db.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <>
      <Link href="/recruiter/jobs/new" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Choose a different template
      </Link>
      <PageHeader title="New job" description={template ? `Based on the “${template.name}” template.` : "Starting from a blank job."} />
      <JobForm jobId={null} isDraft categories={categories} defaults={template ? jobDefaultsFromTemplate(template) : EMPTY_JOB} />
    </>
  );
}
