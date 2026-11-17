import type { Metadata } from "next";
import { deleteCategoryAction } from "@/actions/admin";
import { ConfirmActionButton } from "@/components/action-buttons";
import { CategoryDialog } from "@/components/admin/controls";
import { CategoryIcon } from "@/components/category-icon";
import { PageHeader } from "@/components/page-header";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";

export const metadata: Metadata = { title: "Categories" };

export default async function AdminCategoriesPage() {
  await requireRole("ADMIN", "/admin/categories");
  const categories = await db.category.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { jobs: true } } } });
  return (
    <>
      <PageHeader title="Categories" description="Job categories used for browsing, filtering, and alerts.">
        <CategoryDialog />
      </PageHeader>
      <ul className="divide-y rounded-2xl border bg-card">
        {categories.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center gap-3 p-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <CategoryIcon name={c.icon} className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{c.name}</p>
              <p className="truncate text-sm text-muted-foreground">
                {c._count.jobs} {c._count.jobs === 1 ? "job" : "jobs"}
                {c.description && ` · ${c.description}`}
              </p>
            </div>
            <div className="flex gap-1">
              <CategoryDialog category={{ id: c.id, name: c.name, description: c.description ?? "", icon: c.icon }} />
              <ConfirmActionButton
                variant="ghost"
                size="sm"
                className="text-destructive"
                action={deleteCategoryAction.bind(null, c.id)}
                title={`Delete “${c.name}”?`}
                description="Categories that still contain jobs can’t be deleted."
                confirmLabel="Delete"
              >
                Delete
              </ConfirmActionButton>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
