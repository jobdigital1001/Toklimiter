"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, UserRound } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { signUpAction } from "@/actions/auth";
import { SubmitButton } from "@/components/action-buttons";
import { TextField } from "@/components/forms/fields";
import { Form } from "@/components/ui/form";
import { useAction } from "@/hooks/use-action";
import { signUpSchema, type SignUpInput } from "@/lib/validation";

const ROLES = [
  { value: "CANDIDATE", title: "I’m looking for work", detail: "Find and apply to jobs", icon: UserRound },
  { value: "RECRUITER", title: "I’m hiring", detail: "Post jobs and review applicants", icon: Building2 },
] as const;

export function SignUpForm({ next, defaultRole }: { next?: string; defaultRole: SignUpInput["role"] }) {
  const form = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: "", email: "", password: "", role: defaultRole },
  });
  const { pending, run } = useAction();
  const role = useWatch({ control: form.control, name: "role" });
  return (
    <Form {...form}>
      <form
        method="post"
        noValidate
        className="space-y-4"
        onSubmit={form.handleSubmit((values) =>
          run(() => signUpAction(values, next), { form, onSuccess: ({ redirectTo }) => window.location.assign(redirectTo) }),
        )}
      >
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Account type</legend>
          <div className="grid grid-cols-2 gap-2.5">
            {ROLES.map((r) => (
              <label
                key={r.value}
                className="flex cursor-pointer flex-col gap-1 rounded-xl border p-3.5 text-sm transition-colors has-checked:border-primary has-checked:bg-accent/60 has-focus-visible:ring-[3px] has-focus-visible:ring-ring/50"
              >
                <input
                  type="radio"
                  className="sr-only"
                  value={r.value}
                  checked={role === r.value}
                  onChange={() => form.setValue("role", r.value)}
                />
                <r.icon className="size-5 text-primary" />
                <span className="mt-1 leading-tight font-medium">{r.title}</span>
                <span className="text-xs text-muted-foreground">{r.detail}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <TextField control={form.control} name="name" label="Full name" autoComplete="name" />
        <TextField control={form.control} name="email" label="Email" type="email" autoComplete="email" />
        <TextField
          control={form.control}
          name="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          description="At least 8 characters, with a letter and a number."
        />
        <SubmitButton pending={pending} size="lg" className="h-11 w-full">
          Create account
        </SubmitButton>
      </form>
    </Form>
  );
}
