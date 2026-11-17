import type { Metadata } from "next";
import { setUserStatusAction } from "@/actions/admin";
import { ActionButton, ConfirmActionButton } from "@/components/action-buttons";
import { RoleSelect } from "@/components/admin/controls";
import { ADMIN_PAGE_SIZE, AdminSearch, listHref, parseListParams } from "@/components/admin/list-tools";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { requireRole } from "@/lib/session";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Users" };

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const me = await requireRole("ADMIN", "/admin/users");
  const { q, page } = parseListParams(await searchParams);
  const where: Prisma.UserWhereInput = q
    ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] }
    : {};
  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
      select: { id: true, name: true, email: true, role: true, status: true, createdAt: true, company: { select: { name: true } } },
    }),
    db.user.count({ where }),
  ]);
  return (
    <>
      <PageHeader title="Users" description={`${total.toLocaleString("en-US")} accounts. Change roles or suspend access.`} />
      <AdminSearch action="/admin/users" q={q} placeholder="Search by name or email" />
      <div className="overflow-x-auto rounded-2xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Access</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                  No users match your search.
                </TableCell>
              </TableRow>
            )}
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <p className="flex items-center gap-2 font-medium">
                    {u.name ?? "—"}
                    {u.status === "SUSPENDED" && <Badge variant="destructive">Suspended</Badge>}
                    {u.id === me.id && <Badge variant="outline">You</Badge>}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {u.email}
                    {u.company && ` · ${u.company.name}`}
                  </p>
                </TableCell>
                <TableCell className="text-sm whitespace-nowrap text-muted-foreground">{formatDate(u.createdAt)}</TableCell>
                <TableCell>
                  <RoleSelect userId={u.id} role={u.role} name={u.name ?? u.email} />
                </TableCell>
                <TableCell className="text-right">
                  {u.id === me.id ? null : u.status === "ACTIVE" ? (
                    <ConfirmActionButton
                      variant="outline"
                      size="sm"
                      action={setUserStatusAction.bind(null, u.id, true)}
                      title={`Suspend ${u.name ?? u.email}?`}
                      description="They will be signed out and unable to sign in until reactivated."
                      confirmLabel="Suspend"
                    >
                      Suspend
                    </ConfirmActionButton>
                  ) : (
                    <ActionButton variant="outline" size="sm" action={setUserStatusAction.bind(null, u.id, false)}>
                      Reactivate
                    </ActionButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Pagination page={page} totalPages={Math.ceil(total / ADMIN_PAGE_SIZE)} hrefFor={(p) => listHref("/admin/users", { q, page: p })} />
    </>
  );
}
