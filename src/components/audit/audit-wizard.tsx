"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { RepoPicker, type RepoOption } from "@/components/audit/repo-picker";
import { Stepper, STEPS } from "@/components/audit/stepper";

export function AuditWizard() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [repo, setRepo] = useState<RepoOption | null>(null);
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
    </div>
  );
}
