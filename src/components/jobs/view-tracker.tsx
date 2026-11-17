"use client";

import { useEffect } from "react";
import { trackJobViewAction } from "@/actions/candidate";

/** Counts one view per browser session per job, and only from real page loads. */
export function ViewTracker({ jobId }: { jobId: string }) {
  useEffect(() => {
    const key = `viewed:${jobId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // Storage unavailable (private mode): still count the view.
    }
    void trackJobViewAction(jobId);
  }, [jobId]);
  return null;
}
