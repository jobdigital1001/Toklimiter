"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { signInAction } from "@/actions/auth";
import { SubmitButton } from "@/components/action-buttons";
import { TextField } from "@/components/forms/fields";
import { Form } from "@/components/ui/form";
import { useAction } from "@/hooks/use-action";
import { signInSchema, type SignInInput } from "@/lib/validation";

export function SignInForm({ next }: { next?: string }) {
  const form = useForm<SignInInput>({ resolver: zodResolver(signInSchema), defaultValues: { email: "", password: "" } });
  const { pending, run } = useAction();
  return (
    <Form {...form}>
      <form
        method="post"
        noValidate
        className="space-y-4"
        onSubmit={form.handleSubmit((values) =>
          run(() => signInAction(values, next), {
            form,
            // Full navigation so every server component re-renders with the new session.
            onSuccess: ({ redirectTo }) => window.location.assign(redirectTo),
          }),
        )}
      >
        <TextField control={form.control} name="email" label="Email" type="email" autoComplete="email" />
        <TextField control={form.control} name="password" label="Password" type="password" autoComplete="current-password" />
        <SubmitButton pending={pending} size="lg" className="h-11 w-full">
          Sign in
        </SubmitButton>
      </form>
    </Form>
  );
}
