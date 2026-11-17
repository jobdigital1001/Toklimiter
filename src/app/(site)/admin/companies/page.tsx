import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { setCompanyFlagAction } from "@/actions/admin";
import { ActionButton, ConfirmActionButton } from "@/components/action-buttons";
import { ADMIN_PAGE_SIZE, AdminSearch, listHref, parseListParams } from "@/components/admin/list-tools";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { requireRole } from "@/lib/session";

export const metadata: Metadata = { title: "Companies" };

export default async function AdminCompaniesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireRole("ADMIN", "/admin/companies");
  const { q, page } = parseListParams(await searchParams);
  const where: Prisma.CompanyWhereInput = q ? { name: { contains: q, mode: "insensitive" } } : {};
  const [companies, total] = await Promise.all([
    db.company.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
      select: { id: true, slug: true, name: true, industry: true, verified: true, suspended: true, _count: { select: { jobs: true, members: true } } },
    }),
    db.company.count({ where }),
  ]);
  return (
    <>
      <PageHeader title="Companies" description="Verify trusted companies and suspend those that break the rules." />
      <AdminSearch action="/admin/companies" q={q} placeholder="Search companies" />
      <div className="overflow-x-auto rounded-2xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead className="text-right">Jobs</TableHead>
              <TableHead className="text-right">Recruiters</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                  No companies found.
                </TableCell>
              </TableRow>
            )}
            {companies.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <p className="flex items-center gap-1.5 font-medium">
                    {c.suspended ? c.name : (
                      <Link href={`/companies/${c.slug}`} className="underline-offset-4 hover:underline">
                        {c.name}
                      </Link>
                    )}
                    {c.verified && <BadgeCheck className="size-4 text-primary" aria-label="Verified" />}
                    {c.suspended && <Badge variant="destructive">Suspended</Badge>}
                  </p>
                  <p className="text-sm text-muted-foreground">{c.industry}</p>
                </TableCell>
                <TableCell className="text-right tabular-nums">{c._count.jobs}</TableCell>
                <TableCell className="text-right tabular-nums">{c._count.members}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <ActionButton variant="outline" size="sm" action={setCompanyFlagAction.bind(null, c.id, "verified", !c.verified)}>
                      {c.verified ? "Unverify" : "Verify"}
                    </ActionButton>
                    {c.suspended ? (
                      <ActionButton variant="outline" size="sm" action={setCompanyFlagAction.bind(null, c.id, "suspended", false)}>
                        Reinstate
                      </ActionButton>
                    ) : (
                      <ConfirmActionButton
                        variant="outline"
                        size="sm"
                        action={setCompanyFlagAction.bind(null, c.id, "suspended", true)}
                        title={`Suspend ${c.name}?`}
                        description="The company profile and all of its jobs will be hidden from the public site."
                        confirmLabel="Suspend"
                      >
                        Suspend
                      </ConfirmActionButton>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Pagination page={page} totalPages={Math.ceil(total / ADMIN_PAGE_SIZE)} hrefFor={(p) => listHref("/admin/companies", { q, page: p })} />
    </>
  );
}
