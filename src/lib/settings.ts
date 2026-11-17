import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import type { SettingsInput } from "@/lib/validation";

export const DEFAULT_SETTINGS: SettingsInput = {
  supportEmail: "support@example.com",
  announcement: "",
  featuredJobsLimit: 8,
  jobsPerPage: 12,
  allowRegistrations: true,
};

export const getSettings = cache(async (): Promise<SettingsInput> => {
  const rows = await db.setting.findMany();
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const num = (key: keyof SettingsInput, fallback: number) => {
    const n = Number.parseInt(map.get(key) ?? "", 10);
    return Number.isFinite(n) ? n : fallback;
  };
  return {
    supportEmail: map.get("supportEmail") ?? DEFAULT_SETTINGS.supportEmail,
    announcement: map.get("announcement") ?? DEFAULT_SETTINGS.announcement,
    featuredJobsLimit: num("featuredJobsLimit", DEFAULT_SETTINGS.featuredJobsLimit),
    jobsPerPage: num("jobsPerPage", DEFAULT_SETTINGS.jobsPerPage),
    allowRegistrations: (map.get("allowRegistrations") ?? "true") === "true",
  };
});
