import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { downloadResponse, readStoredFile } from "@/lib/storage";

/** The signed-in candidate's own profile CV. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const profile = await db.candidateProfile.findUnique({ where: { userId: user.id }, select: { cvKey: true, cvFileName: true } });
  if (!profile?.cvKey) return new Response("Not found", { status: 404 });
  const file = await readStoredFile(profile.cvKey);
  if (!file) return new Response("Not found", { status: 404 });
  return downloadResponse(file, profile.cvFileName ?? "cv.pdf");
}
