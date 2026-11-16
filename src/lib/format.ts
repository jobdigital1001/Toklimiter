const dateFormat = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

/** Stable, timezone-independent date label (avoids server/client mismatches). */
export function formatDate(iso: string): string {
  return `${dateFormat.format(new Date(iso))} UTC`;
}
