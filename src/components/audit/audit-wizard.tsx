"use client";

import { useEffect, useRef, useState } from "react";
import { AuditReport } from "@/components/audit/audit-report";
import { RepoPicker, type RepoOption } from "@/components/audit/repo-picker";
import { Stepper, STEPS } from "@/components/audit/stepper";
import { TaskForm, type TaskErrors, type TaskValues } from "@/components/audit/task-form";
import { Button } from "@/components/ui/button";
import type { AuditView } from "@/lib/audit-store";
import { useClientSettings } from "@/lib/client-settings";
import { parsePatterns } from "@/lib/patterns";
import { auditRequestSchema, DEFAULT_TOKEN_BUDGET } from "@/lib/validation";

const INITIAL_TASK: TaskValues = {
  prompt: "",
  include: "",
  exclude: "",
  budget: String(DEFAULT_TOKEN_BUDGET),
};

const FIELD_FOR_PATH: Record<string, keyof TaskValues> = {
  prompt: "prompt",
  includePatterns: "include",
  excludePatterns: "exclude",
  tokenBudget: "budget",
};

interface Result {
  audit: AuditView;
  warnings: string[];
}

export function AuditWizard() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [repo, setRepo] = useState<RepoOption | null>(null);
  const [task, setTask] = useState<TaskValues>(INITIAL_TASK);
  const [errors, setErrors] = useState<TaskErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const settings = useClientSettings();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  // Move focus to the step heading on step changes so keyboard and screen
  // reader users land at the start of the new step.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
    window.scrollTo({ top: 0 });
  }, [step]);

  async function submit() {
    if (!repo || submitting) return;
    const accurate = settings.accurate && settings.anthropicKey !== "";
    const parsed = auditRequestSchema.safeParse({
      repository: repo.fullName,
      prompt: task.prompt,
      includePatterns: parsePatterns(task.include),
      excludePatterns: parsePatterns(task.exclude),
      tokenBudget: Number(task.budget),
      accurate,
    });
    if (!parsed.success) {
      const next: TaskErrors = {};
      for (const issue of parsed.error.issues) {
        const field = FIELD_FOR_PATH[String(issue.path[0])];
        if (field && !next[field]) {
          next[field] = field === "budget" ? "Enter a whole number between 1,000 and 1,000,000." : issue.message;
        }
      }
      setErrors(next);
      setFormError(Object.keys(next).length === 0 ? "Check the form and try again." : null);
      return;
    }

    setErrors({});
    setFormError(null);
    setSubmitting(true);
    try {
      const response = await fetch("/api/audits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accurate ? { "x-anthropic-api-key": settings.anthropicKey } : {}),
        },
        body: JSON.stringify(parsed.data),
      });
      const body = (await response.json().catch(() => ({}))) as Partial<Result> & { error?: string };
      if (!response.ok || !body.audit) {
        setFormError(body.error ?? "The audit could not be completed. Try again.");
        return;
      }
      setResult({ audit: body.audit, warnings: body.warnings ?? [] });
      setStep(3);
    } catch {
      setFormError("Network error. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function startOver() {
    setResult(null);
    setTask(INITIAL_TASK);
    setRepo(null);
    setStep(1);
  }

  return (
    <div className="flex flex-col gap-6">
      <Stepper current={step} />
      <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-bold outline-none">
        {STEPS[step - 1]}
      </h1>

      {step === 1 ? (
        <section aria-label="Choose repository" className="flex flex-col gap-4">
          <p className="text-muted-foreground">
            Pick the repository your task is about. Access is read-only.
          </p>
          <RepoPicker selected={repo} onSelect={setRepo} />
          <div className="sticky bottom-0 -mx-4 border-t bg-background px-4 py-3">
            <Button className="w-full" disabled={!repo} onClick={() => setStep(2)}>
              Continue
            </Button>
          </div>
        </section>
      ) : null}

      {step === 2 && repo ? (
        <TaskForm
          repository={repo.fullName}
          values={task}
          errors={errors}
          formError={formError}
          submitting={submitting}
          onChange={setTask}
          onBack={() => setStep(1)}
          onSubmit={() => void submit()}
        />
      ) : null}

      {step === 3 && result ? (
        <>
          <AuditReport audit={result.audit} warnings={result.warnings} />
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => setStep(2)}>
              Edit task
            </Button>
            <Button variant="secondary" onClick={startOver}>
              New audit
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
