import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const STEPS = ["Choose repository", "Add task", "Review context pack"] as const;

export function Stepper({ current }: { current: 1 | 2 | 3 }) {
  return (
    <nav aria-label="Progress">
      <ol className="grid grid-cols-3 gap-2">
        {STEPS.map((label, index) => {
          const step = index + 1;
          const done = step < current;
          const active = step === current;
          return (
            <li
              key={label}
              aria-current={active ? "step" : undefined}
              className={cn(
                "flex flex-col gap-1.5 border-t-4 pt-2 text-xs sm:text-sm",
                active || done ? "border-primary" : "border-border text-muted-foreground",
              )}
            >
              <span className="flex items-center gap-1 font-semibold">
                {done ? <Check className="size-4" aria-hidden="true" /> : null}
                <span>
                  Step {step}
                  <span className="sr-only">
                    {done ? " (completed)" : active ? " (current)" : ""}
                  </span>
                </span>
              </span>
              <span className={cn(active ? "font-medium" : "")}>{label}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
