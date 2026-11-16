import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { listAuditsForUser } from "@/lib/audit-store";
import { formatDate } from "@/lib/format";
import { formatTokens } from "@/lib/utils";

export const metadata: Metadata = { title: "History" };

export default async function HistoryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  const audits = await listAuditsForUser(user.id);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">History</h1>
      {audits.length === 0 ? (
        <div className="flex flex-col items-start gap-4">
          <p className="text-muted-foreground">
            You have not run an audit yet. Your audits and context packs will appear here.
          </p>
          <Button asChild>
            <Link href="/audit">Start an audit</Link>
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {audits.map((audit) => (
            <li key={audit.id}>
              <Link
                href={`/history/${audit.id}`}
                className="flex flex-col gap-1 rounded-xl border bg-card p-4 hover:bg-muted"
              >
                <span className="font-semibold">{audit.task}</span>
                <span className="break-all text-sm text-muted-foreground">{audit.repository}</span>
                <span className="text-sm text-muted-foreground">
                  <time dateTime={audit.createdAt}>{formatDate(audit.createdAt)}</time> ·{" "}
                  {formatTokens(audit.estimatedTokens)} → {formatTokens(audit.recommendedTokens)} tokens ·{" "}
                  {audit.findingCount} {audit.findingCount === 1 ? "finding" : "findings"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
