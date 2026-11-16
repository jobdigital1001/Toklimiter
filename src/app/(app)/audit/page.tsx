import type { Metadata } from "next";
import { AuditWizard } from "@/components/audit/audit-wizard";

export const metadata: Metadata = { title: "New audit" };

export default function AuditPage() {
  return <AuditWizard />;
}
