import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { CompanyForm } from "@/components/recruiter/company-form";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import type { CompanyInput } from "@/lib/validation";

export const metadata: Metadata = { title: "Company profile" };

export default async function CompanyProfilePage() {
  const user = await requireRole("RECRUITER", "/recruiter/company");
  const company = user.companyId ? await db.company.findUnique({ where: { id: user.companyId } }) : null;
  const defaults: CompanyInput = {
    name: company?.name ?? "",
    tagline: company?.tagline ?? "",
    description: company?.description ?? "",
    logoUrl: company?.logoUrl ?? "",
    bannerUrl: company?.bannerUrl ?? "",
    website: company?.website ?? "",
    location: company?.location ?? "",
    industry: company?.industry ?? "",
    size: (company?.size as CompanyInput["size"]) ?? "11-50",
    culture: company?.culture ?? "",
    highlights: company?.highlights ?? [],
    linkedinUrl: company?.linkedinUrl ?? "",
    twitterUrl: company?.twitterUrl ?? "",
    githubUrl: company?.githubUrl ?? "",
  };
  return (
    <>
      <PageHeader
        title={company ? "Company profile" : "Set up your company"}
        description={
          company
            ? "This is what candidates see on your public company page."
            : "Create your company profile to start posting jobs. You can refine it any time."
        }
      >
        {company && (
          <Button asChild variant="outline">
            <Link href={`/companies/${company.slug}`}>
              View public page <ExternalLink />
            </Link>
          </Button>
        )}
      </PageHeader>
      {company?.suspended && (
        <p role="alert" className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Your company is suspended. Its profile and jobs are hidden from candidates. Contact support for help.
        </p>
      )}
      <CompanyForm defaults={defaults} isNew={!company} />
    </>
  );
}
