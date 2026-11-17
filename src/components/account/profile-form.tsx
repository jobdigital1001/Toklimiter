"use client";

import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { updateProfileAction } from "@/actions/candidate";
import { SubmitButton } from "@/components/action-buttons";
import { TagsField, TextareaField, TextField } from "@/components/forms/fields";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAction } from "@/hooks/use-action";
import { VISIBILITIES, VISIBILITY_LABELS } from "@/lib/constants";
import { profileSchema, type ProfileInput } from "@/lib/validation";

export function ProfileForm({ defaults }: { defaults: ProfileInput }) {
  const router = useRouter();
  const form = useForm<ProfileInput>({ resolver: zodResolver(profileSchema), defaultValues: defaults });
  const { pending, run } = useAction();
  return (
    <Form {...form}>
      <form
        method="post"
        noValidate
        className="space-y-8"
        onSubmit={form.handleSubmit((values) =>
          run(() => updateProfileAction(values), {
            form,
            onSuccess: () => {
              form.reset(values);
              router.refresh();
            },
          }),
        )}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField control={form.control} name="name" label="Full name" autoComplete="name" />
          <TextField control={form.control} name="headline" label="Headline" optional placeholder="Senior Product Designer" />
          <TextField control={form.control} name="location" label="Location" optional placeholder="Berlin, Germany" />
          <TextField control={form.control} name="phone" label="Phone" optional type="tel" autoComplete="tel" />
          <TextareaField
            className="sm:col-span-2"
            control={form.control}
            name="bio"
            label="Bio"
            optional
            rows={5}
            placeholder="What do you do best, and what are you looking for next?"
          />
          <TagsField className="sm:col-span-2" control={form.control} name="skills" label="Skills" optional placeholder="e.g. TypeScript, Figma, SQL" />
          <TextField control={form.control} name="portfolioUrl" label="Portfolio" optional type="url" placeholder="https://" />
          <TextField control={form.control} name="linkedinUrl" label="LinkedIn" optional type="url" placeholder="https://linkedin.com/in/…" />
          <TextField control={form.control} name="githubUrl" label="GitHub" optional type="url" placeholder="https://github.com/…" />
        </div>

        <FormField
          control={form.control}
          name="visibility"
          render={({ field }) => (
            <FormItem>
              <FormLabel asChild>
                <legend>Profile visibility</legend>
              </FormLabel>
              <FormControl>
                <div role="radiogroup" aria-label="Profile visibility" className="grid gap-2.5 sm:grid-cols-3">
                  {VISIBILITIES.map((v) => (
                    <label
                      key={v}
                      className="flex cursor-pointer flex-col gap-1 rounded-xl border p-3.5 text-sm has-checked:border-primary has-checked:bg-accent/60"
                    >
                      <span className="flex items-center gap-2 font-medium">
                        <input
                          type="radio"
                          name="visibility"
                          className="accent-primary"
                          checked={field.value === v}
                          onChange={() => field.onChange(v)}
                        />
                        {VISIBILITY_LABELS[v].label}
                      </span>
                      <span className="text-xs leading-5 text-muted-foreground">{VISIBILITY_LABELS[v].hint}</span>
                    </label>
                  ))}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <SubmitButton pending={pending} size="lg">
          Save profile
        </SubmitButton>
      </form>
    </Form>
  );
}
