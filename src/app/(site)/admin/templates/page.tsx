import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { deleteSystemTemplateAction } from "@/actions/admin";
import { ConfirmActionButton } from "@/components/action-buttons";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";

export const metadata: Metadata = { title: "Templates" };

export default async function AdminTemplatesPage() {
  await requireRole("ADMIN", "/admin/templates");
  const templates = await db.jobTemplate.findMany({
    where: { isSystem: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, title: true, category: { select: { name: true } } },
  });
  return (
    <>
      <PageHeader title="Built-in templates" description="Job templates available to every recruiter on the platform.">
        <Button asChild>
          <Link href="/admin/templates/new">
            <Plus /> New template
          </Link>
        </Button>
      </PageHeader>
      <ul className="divide-y rounded-2xl border bg-card">
        {templates.map((t) => (
          <li key={t.id} className="flex flex-wrap items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 font-medium">
                {t.name}
                {t.category && <Badge variant="outline">{t.category.name}</Badge>}
              </p>
              <p className="truncate text-sm text-muted-foreground">Default title: {t.title}</p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/templates/${t.id}`}>Edit</Link>
            </Button>
            <ConfirmActionButton
              variant="ghost"
              size="sm"
              className="text-destructive"
              action={deleteSystemTemplateAction.bind(null, t.id)}
              title={`Delete “${t.name}”?`}
              description="Recruiters will no longer be able to start jobs from this template."
              confirmLabel="Delete"
            >
              Delete
            </ConfirmActionButton>
          </li>
        ))}
      </ul>
    </>
  );
}
