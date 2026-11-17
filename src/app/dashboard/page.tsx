import { redirect } from "next/navigation";
import { homeForRole, requireUser } from "@/lib/session";

/** Post-sign-in landing: sends each role to its home. */
export default async function DashboardRedirect() {
  const user = await requireUser("/dashboard");
  redirect(homeForRole(user.role));
}
