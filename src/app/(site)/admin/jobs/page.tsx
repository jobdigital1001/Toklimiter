import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { adminCloseJobAction, adminDeleteJobAction, setJobFeaturedAction } from "@/actions/admin";
import { ActionButton, ConfirmActionButton } from "@/components/action-buttons";
import { ADMIN_PAGE_SIZE, AdminSearch, listHref, parseListParams } from "@/components/admin/list-tools";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { JobStatusBadge } from "@/components/status-badge";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { JOB_STATUSES, JOB_STATUS_LABELS, type JobStatusValue } from "@/lib/constants";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { requireRole } from "@/lib/session";

export const metadata: Metadata = { title: "Jobs" };

export default async function AdminJobsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireRole("ADMIN", "/admin/jobs");
  const { q, page, filter } = parseListParams(await searchParams);
  const status = (JOB_STATUSES as readonly string[]).includes(filter) ? (filter as JobStatusValue) : null;
  const where: Prisma.JobWhereInput = {
    ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { company: { name: { contains: q, mode: "insensitive" } } }] } : {}),
    ...(status ? { status } : {}),
    ...(filter === "featured" ? { featured: true } : {}),
  };
  const [jobs, total] = await Promise.all([
    db.job.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
      select: { id: true, slug: true, title: true, status: true, featured: true, company: { select: { name: true } }, _count: { select: { applications: true } } },
    }),
    db.job.count({ where }),
  ]);
  return (
    <>
      <PageHeader title="Jobs" description="Feature standout roles on the home page and moderate postings." />
      <AdminSearch action="/admin/jobs" q={q} placeholder="Search by title or company">
        <NativeSelect name="filter" aria-label="Filter jobs" defaultValue={filter} className="w-40">
          <option value="">All jobs</option>
          <option value="featured">Featured</option>
          {JOB_STATUSES.map((s) => (
            <option key={s} value={s}>
              {JOB_STATUS_LABELS[s]}
            </option>
          ))}
        </NativeSelect>
      </AdminSearch>
      <div className="overflow-x-auto rounded-2xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Job</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Applications</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                  No jobs found.
                </TableCell>
              </TableRow>
            )}
            {jobs.map((j) => (
              <TableRow key={j.id}>
                <TableCell>
                  <p className="flex items-center gap-1.5 font-medium">
                    {j.status === "PUBLISHED" ? (
                      <Link href={`/jobs/${j.slug}`} className="underline-offset-4 hover:underline">
                        {j.title}
                      </Link>
                    ) : (
                      j.title
                    )}
                    {j.featured && <Sparkles className="size-4 text-spark" aria-label="Featured" />}
                  </p>
                  <p className="text-sm text-muted-foreground">{j.company.name}</p>
                </TableCell>
                <TableCell>
                  <JobStatusBadge status={j.status} />
                </TableCell>
                <TableCell className="text-right tabular-nums">{j._count.applications}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    {j.status === "PUBLISHED" && (
                      <ActionButton variant="outline" size="sm" action={setJobFeaturedAction.bind(null, j.id, !j.featured)}>
                        {j.featured ? "Unfeature" : "Feature"}
                      </ActionButton>
                    )}
                    {(j.status === "PUBLISHED" || j.status === "PAUSED") && (
                      <ConfirmActionButton
                        variant="outline"
                        size="sm"
                        action={adminCloseJobAction.bind(null, j.id)}
                        title={`Close “${j.title}”?`}
                        description="The job will be removed from the public site and stop accepting applications."
                        confirmLabel="Close job"
                      >
                        Close
                      </ConfirmActionButton>
                    )}
                    <ConfirmActionButton
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      action={adminDeleteJobAction.bind(null, j.id)}
                      title={`Delete “${j.title}”?`}
                      description={`This permanently deletes the job and its ${j._count.applications} application(s). This can’t be undone.`}
                      confirmLabel="Delete"
                    >
                      Delete
                    </ConfirmActionButton>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Pagination page={page} totalPages={Math.ceil(total / ADMIN_PAGE_SIZE)} hrefFor={(p) => listHref("/admin/jobs", { q, filter, page: p })} />
    </>
  );
}
