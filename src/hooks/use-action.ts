"use client";

import { useCallback, useTransition } from "react";
import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import type { ActionResult } from "@/lib/action-result";

type Options<T> = {
  onSuccess?: (data: T) => void;
  /** When provided, server-side field errors are mapped onto the form. */
  form?: UseFormReturn<any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  silent?: boolean;
};

/** Runs a server action inside a transition, surfaces the result as a toast and maps field errors. */
export function useAction() {
  const [pending, startTransition] = useTransition();

  const run = useCallback(<T,>(action: () => Promise<ActionResult<T>>, options: Options<T> = {}) => {
    startTransition(async () => {
      let result: ActionResult<T>;
      try {
        result = await action();
      } catch {
        toast.error("Something went wrong. Please try again.");
        return;
      }
      if (result.ok) {
        if (result.message && !options.silent) toast.success(result.message);
        options.onSuccess?.(result.data);
        return;
      }
      toast.error(result.error);
      applyFieldErrors(options.form, result.fieldErrors);
    });
  }, []);

  return { pending, run };
}

export function applyFieldErrors<T extends FieldValues>(
  form: UseFormReturn<T> | undefined,
  fieldErrors: Record<string, string> | undefined,
) {
  if (!form || !fieldErrors) return;
  for (const [name, message] of Object.entries(fieldErrors)) {
    form.setError(name as Path<T>, { type: "server", message });
  }
}
