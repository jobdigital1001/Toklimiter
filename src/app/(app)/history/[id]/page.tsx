import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AuditReport } from "@/components/audit/audit-report";
import { getCurrentUser } from "@/lib/auth";
import { getAuditForUser } from "@/lib/audit-store";
import { formatDate } from "@/lib/format";
import { auditIdSchema } from "@/lib/validation";

export const metadata: Metadata = { title: "Audit" };

export default async function AuditDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  const id = auditIdSchema.safeParse((await params).id);
  if (!id.success) notFound();
  // Scoped to the signed-in user: other users' audits are indistinguishable from missing ones.
  const audit = await getAuditForUser(user.id, id.data);
  if (!audit) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/history"
        className="flex min-h-12 items-center gap-2 self-start font-medium text-primary"
      >
        <ArrowLeft className="size-5" aria-hidden="true" /> History
      </Link>
      <div>
        <h1 className="text-2xl font-bold">Audit</h1>
        <p className="text-sm text-muted-foreground">
          <time dateTime={audit.createdAt}>{formatDate(audit.createdAt)}</time>
        </p>
      </div>
      <AuditReport audit={audit} />
    </div>
  );
}
