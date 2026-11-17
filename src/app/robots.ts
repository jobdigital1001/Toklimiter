import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/utils";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/account", "/recruiter", "/admin", "/api", "/onboarding", "/dashboard"] }],
    sitemap: appUrl("/sitemap.xml"),
  };
}
