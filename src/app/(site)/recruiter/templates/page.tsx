import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { deleteTemplateAction } from "@/actions/recruiter";
import { ConfirmActionButton } from "@/components/action-buttons";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { requireRecruiterCompany } from "@/lib/session";

export const metadata: Metadata = { title: "Job templates" };

export default async function TemplatesPage() {
  const user = await requireRecruiterCompany("/recruiter/templates");
  const templates = await db.jobTemplate.findMany({
    where: { OR: [{ isSystem: true }, { companyId: user.companyId }] },
    orderBy: [{ isSystem: "asc" }, { name: "asc" }],
    select: { id: true, name: true, title: true, isSystem: true, category: { select: { name: true } } },
  });
  const own = templates.filter((t) => !t.isSystem);
  const system = templates.filter((t) => t.isSystem);

  const row = (t: (typeof templates)[number]) => (
    <li key={t.id} className="flex flex-col gap-3 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 font-medium">
          {t.name}
          {t.category && <Badge variant="outline">{t.category.name}</Badge>}
        </p>
        <p className="truncate text-sm text-muted-foreground">Default title: {t.title}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm">
          <Link href={`/recruiter/jobs/new?template=${t.id}`}>Use template</Link>
        </Button>
        {!t.isSystem && (
          <>
            <Button asChild size="sm" variant="outline">
              <Link href={`/recruiter/templates/${t.id}`}>Edit</Link>
            </Button>
            <ConfirmActionButton
              size="sm"
              variant="ghost"
              className="text-destructive"
              action={deleteTemplateAction.bind(null, t.id)}
              title={`Delete “${t.name}”?`}
              description="Jobs already created from this template are not affected."
              confirmLabel="Delete"
            >
              Delete
            </ConfirmActionButton>
          </>
        )}
      </div>
    </li>
  );

  return (
    <>
      <PageHeader title="Job templates" description="Reuse role descriptions, requirements, and screening questions across postings.">
        <Button asChild>
          <Link href="/recruiter/templates/new">
            <Plus /> New template
          </Link>
        </Button>
      </PageHeader>
      <section aria-labelledby="own-heading">
        <h2 id="own-heading" className="mb-3 font-semibold">
          Your templates
        </h2>
        {own.length === 0 ? (
          <p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
            You haven’t created any templates yet. Custom templates are shared with your company.
          </p>
        ) : (
          <ul className="space-y-3">{own.map(row)}</ul>
        )}
      </section>
      <section aria-labelledby="system-heading" className="mt-10">
        <h2 id="system-heading" className="mb-3 font-semibold">
          Built-in templates
        </h2>
        <ul className="space-y-3">{system.map(row)}</ul>
      </section>
    </>
  );
}
