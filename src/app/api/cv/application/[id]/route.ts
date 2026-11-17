import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { downloadResponse, readStoredFile } from "@/lib/storage";

/** CV attached to an application. Visible to the applicant, the hiring company's recruiters, and admins. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  const application = await db.application.findUnique({
    where: { id },
    select: { userId: true, cvKey: true, cvFileName: true, job: { select: { companyId: true } } },
  });
  const allowed =
    application &&
    (user.role === "ADMIN" ||
      application.userId === user.id ||
      (user.role === "RECRUITER" && user.companyId !== null && user.companyId === application.job.companyId));
  // Same response for "missing" and "forbidden" so IDs can't be probed.
  if (!allowed || !application.cvKey) return new Response("Not found", { status: 404 });
  const file = await readStoredFile(application.cvKey);
  if (!file) return new Response("Not found", { status: 404 });
  return downloadResponse(file, application.cvFileName ?? "cv.pdf");
}
