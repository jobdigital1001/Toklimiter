"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { subscribeNewsletterAction } from "@/actions/candidate";
import { SubmitButton } from "@/components/action-buttons";
import { Input } from "@/components/ui/input";
import { useAction } from "@/hooks/use-action";
import { newsletterSchema } from "@/lib/validation";

export function NewsletterForm() {
  const form = useForm<z.infer<typeof newsletterSchema>>({
    resolver: zodResolver(newsletterSchema),
    defaultValues: { email: "" },
  });
  const { pending, run } = useAction();
  const error = form.formState.errors.email?.message;
  return (
    <form
      method="post"
      noValidate
      onSubmit={form.handleSubmit((values) => run(() => subscribeNewsletterAction(values), { form, onSuccess: () => form.reset() }))}
    >
      <div className="flex gap-2">
        <label htmlFor="newsletter-email" className="sr-only">
          Email address
        </label>
        <Input
          id="newsletter-email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          className="h-10"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "newsletter-error" : undefined}
          {...form.register("email")}
        />
        <SubmitButton pending={pending} size="lg">
          Subscribe
        </SubmitButton>
      </div>
      {error && (
        <p id="newsletter-error" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
