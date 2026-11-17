"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { Download, FileText, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { removeCvAction, uploadCvAction } from "@/actions/candidate";
import { ConfirmActionButton } from "@/components/action-buttons";
import { Button } from "@/components/ui/button";
import { useAction } from "@/hooks/use-action";
import { CV_EXTENSIONS, CV_MAX_BYTES } from "@/lib/constants";

export function CvCard({ fileName }: { fileName: string | null }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const { pending, run } = useAction();

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > CV_MAX_BYTES) {
      toast.error("Your CV must be 4 MB or smaller.");
      return;
    }
    const data = new FormData();
    data.set("cv", file);
    run(() => uploadCvAction(data), { onSuccess: () => router.refresh() });
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-dashed p-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <FileText className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{fileName ?? "No CV uploaded"}</p>
          <p className="text-xs text-muted-foreground">PDF, DOC, or DOCX up to 4 MB</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <input ref={inputRef} type="file" accept={CV_EXTENSIONS.join(",")} className="sr-only" aria-label="Upload CV" onChange={onFile} />
        <Button variant="outline" size="sm" disabled={pending} onClick={() => inputRef.current?.click()}>
          {pending ? <Loader2 className="animate-spin" /> : <Upload />}
          {fileName ? "Replace" : "Upload CV"}
        </Button>
        {fileName && (
          <>
            <Button asChild variant="ghost" size="sm">
              <a href="/api/cv/profile" download>
                <Download /> Download
              </a>
            </Button>
            <ConfirmActionButton
              variant="ghost"
              size="sm"
              className="text-destructive"
              action={removeCvAction}
              title="Remove your CV?"
              description="Applications you already submitted keep their copy."
              confirmLabel="Remove"
            >
              Remove
            </ConfirmActionButton>
          </>
        )}
      </div>
    </div>
  );
}
