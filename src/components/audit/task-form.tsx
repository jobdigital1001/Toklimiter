"use client";

import { useId, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, Upload } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useClientSettings } from "@/lib/client-settings";
import { estimateTokens } from "@/lib/tokens";
import { formatTokens } from "@/lib/utils";
import { MAX_PROMPT_CHARS, MAX_TOKEN_BUDGET, MIN_TOKEN_BUDGET } from "@/lib/validation";

export interface TaskValues {
  prompt: string;
  include: string;
  exclude: string;
  budget: string;
}

export type TaskErrors = Partial<Record<keyof TaskValues, string>>;

const MAX_UPLOAD_BYTES = 200_000;

export function TaskForm({
  repository,
  values,
  errors,
  formError,
  submitting,
  onChange,
  onBack,
  onSubmit,
}: {
  repository: string;
  values: TaskValues;
  errors: TaskErrors;
  formError: string | null;
  submitting: boolean;
  onChange: (values: TaskValues) => void;
  onBack: () => void;
  onSubmit: () => void;
}) {
  const id = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const settings = useClientSettings();
  const accurate = settings.accurate && settings.anthropicKey !== "";
  const set = (patch: Partial<TaskValues>) => onChange({ ...values, ...patch });

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadMessage("That file is too large. Upload a text file under 200 KB.");
      return;
    }
    const text = (await file.text()).replace(/\u0000/g, "");
    set({ prompt: text.slice(0, MAX_PROMPT_CHARS) });
    setUploadMessage(
      text.length > MAX_PROMPT_CHARS
        ? `Loaded ${file.name}, trimmed to ${formatTokens(MAX_PROMPT_CHARS)} characters.`
        : `Loaded ${file.name}.`,
    );
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <p className="text-muted-foreground">
        Repository: <span className="break-all font-medium text-foreground">{repository}</span>
      </p>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-prompt`}>Task prompt</Label>
        <Textarea
          id={`${id}-prompt`}
          name="prompt"
          rows={8}
          required
          maxLength={MAX_PROMPT_CHARS}
          placeholder="Describe the task you are about to give Claude Code…"
          value={values.prompt}
          aria-invalid={errors.prompt ? true : undefined}
          aria-describedby={`${id}-prompt-count ${id}-prompt-error`}
          onChange={(event) => set({ prompt: event.target.value })}
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p id={`${id}-prompt-count`} className="text-sm text-muted-foreground">
            {formatTokens(values.prompt.length)} characters · ~
            {formatTokens(estimateTokens(values.prompt))} tokens
          </p>
          <input
            ref={fileInput}
            type="file"
            accept=".md,.markdown,.txt,text/markdown,text/plain"
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(event) => {
              void handleFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          <Button type="button" variant="outline" size="sm" onClick={() => fileInput.current?.click()}>
            <Upload aria-hidden="true" /> Upload task.md
          </Button>
        </div>
        <p id={`${id}-prompt-error`} role="alert" className="text-sm text-destructive empty:hidden">
          {errors.prompt}
        </p>
        <p aria-live="polite" className="text-sm text-muted-foreground empty:hidden">
          {uploadMessage}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-include`}>Include patterns</Label>
        <Textarea
          id={`${id}-include`}
          name="include"
          rows={3}
          className="font-mono text-sm"
          placeholder={"src/**\n*.ts"}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          value={values.include}
          aria-invalid={errors.include ? true : undefined}
          aria-describedby={`${id}-include-hint ${id}-include-error`}
          onChange={(event) => set({ include: event.target.value })}
        />
        <p id={`${id}-include-hint`} className="text-sm text-muted-foreground">
          One glob per line. Leave empty to consider every file.
        </p>
        <p id={`${id}-include-error`} role="alert" className="text-sm text-destructive empty:hidden">
          {errors.include}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-exclude`}>Exclude patterns</Label>
        <Textarea
          id={`${id}-exclude`}
          name="exclude"
          rows={3}
          className="font-mono text-sm"
          placeholder={"docs/\n*.test.ts"}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          value={values.exclude}
          aria-invalid={errors.exclude ? true : undefined}
          aria-describedby={`${id}-exclude-hint ${id}-exclude-error`}
          onChange={(event) => set({ exclude: event.target.value })}
        />
        <p id={`${id}-exclude-hint`} className="text-sm text-muted-foreground">
          <code>.gitignore</code> and <code>.contextbudgetignore</code> are always respected. Secret
          files such as <code>.env</code> are never read.
        </p>
        <p id={`${id}-exclude-error`} role="alert" className="text-sm text-destructive empty:hidden">
          {errors.exclude}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-budget`}>Token budget</Label>
        <Input
          id={`${id}-budget`}
          name="budget"
          type="number"
          inputMode="numeric"
          min={MIN_TOKEN_BUDGET}
          max={MAX_TOKEN_BUDGET}
          step={1000}
          required
          value={values.budget}
          aria-invalid={errors.budget ? true : undefined}
          aria-describedby={`${id}-budget-hint ${id}-budget-error`}
          onChange={(event) => set({ budget: event.target.value })}
        />
        <p id={`${id}-budget-hint`} className="text-sm text-muted-foreground">
          The most context you want this task to use, prompt and files together.
        </p>
        <p id={`${id}-budget-error`} role="alert" className="text-sm text-destructive empty:hidden">
          {errors.budget}
        </p>
      </div>

      <p className="text-sm text-muted-foreground">
        Token counting:{" "}
        <span className="font-medium text-foreground">
          {accurate ? "Anthropic Token Count API (your key)" : "local approximation"}
        </span>
        .{" "}
        <Link href="/settings" className="text-primary underline underline-offset-4">
          Change in Settings
        </Link>
      </p>

      {formError ? (
        <Alert variant="destructive" role="alert">
          {formError}
        </Alert>
      ) : null}

      <div className="sticky bottom-0 -mx-4 flex flex-col gap-2 border-t bg-background px-4 py-3">
        <p role="status" aria-live="polite" className="text-sm text-muted-foreground empty:hidden">
          {submitting
            ? "Scanning the repository and analysing your task. Large repositories can take up to a minute."
            : ""}
        </p>
        <div className="grid grid-cols-[auto_1fr] gap-2">
          <Button type="button" variant="outline" disabled={submitting} onClick={onBack}>
            Back
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="animate-spin" aria-hidden="true" /> Scanning…
              </>
            ) : (
              "Scan repository"
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
