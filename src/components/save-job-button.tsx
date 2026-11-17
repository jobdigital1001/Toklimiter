"use client";

import { useOptimistic, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bookmark } from "lucide-react";
import { toast } from "sonner";
import { toggleSaveJobAction } from "@/actions/candidate";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SaveJobButton({
  jobId,
  saved,
  canSave,
  signedIn,
  variant = "icon",
}: {
  jobId: string;
  saved: boolean;
  /** False for recruiters/admins, who cannot save jobs. */
  canSave: boolean;
  signedIn: boolean;
  variant?: "icon" | "full";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [optimisticSaved, setOptimisticSaved] = useOptimistic(saved);

  if (signedIn && !canSave) return null;

  const onClick = () => {
    if (!signedIn) {
      router.push(`/sign-in?next=${encodeURIComponent(pathname)}`);
      return;
    }
    startTransition(async () => {
      setOptimisticSaved(!optimisticSaved);
      const result = await toggleSaveJobAction(jobId);
      if (!result.ok) toast.error(result.error);
      else {
        toast.success(result.message);
        router.refresh();
      }
    });
  };

  const label = optimisticSaved ? "Remove from saved jobs" : "Save job";
  if (variant === "full") {
    return (
      <Button variant="outline" size="lg" onClick={onClick} disabled={pending} aria-pressed={optimisticSaved}>
        <Bookmark className={cn(optimisticSaved && "fill-primary text-primary")} />
        {optimisticSaved ? "Saved" : "Save job"}
      </Button>
    );
  }
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      disabled={pending}
      aria-label={label}
      aria-pressed={optimisticSaved}
      title={label}
      className="relative z-10 -mt-1 -mr-2 text-muted-foreground"
    >
      <Bookmark className={cn("size-[1.15rem]", optimisticSaved && "fill-primary text-primary")} />
    </Button>
  );
}
