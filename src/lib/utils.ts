import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function compactMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    notation: "compact",
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(amount);
}

export function formatSalary(
  min: number | null | undefined,
  max: number | null | undefined,
  currency = "USD",
): string | null {
  if (min == null && max == null) return null;
  if (min != null && max != null) {
    if (min === max) return `${compactMoney(min, currency)} / yr`;
    return `${compactMoney(min, currency)} – ${compactMoney(max, currency)} / yr`;
  }
  if (min != null) return `From ${compactMoney(min, currency)} / yr`;
  return `Up to ${compactMoney(max as number, currency)} / yr`;
}

export function timeAgo(date: Date, now: Date = new Date()): string {
  const seconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));
  if (seconds < 60) return "just now";
  const units: [number, string][] = [
    [60, "minute"],
    [24, "hour"],
    [7, "day"],
    [4.345, "week"],
    [12, "month"],
    [Number.POSITIVE_INFINITY, "year"],
  ];
  let value = seconds / 60;
  for (const [size, label] of units) {
    if (value < size) {
      const rounded = Math.floor(value);
      return `${rounded} ${label}${rounded === 1 ? "" : "s"} ago`;
    }
    value /= size;
  }
  return "a long time ago";
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/** Share of views that turned into applications, as a percentage with one decimal. */
export function conversionRate(applications: number, views: number): number {
  if (views <= 0) return 0;
  return Math.round(Math.min(1, applications / views) * 1000) / 10;
}

export function appUrl(path = ""): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000");
  return `${base.replace(/\/$/, "")}${path}`;
}

/** Only allow same-origin relative redirects. */
export function safeRedirect(target: string | null | undefined, fallback = "/"): string {
  if (!target || !target.startsWith("/") || target.startsWith("//") || target.includes("\\")) {
    return fallback;
  }
  return target;
}

export function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 86_400_000);
}
