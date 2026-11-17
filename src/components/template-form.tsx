"use client";

import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { SubmitButton } from "@/components/action-buttons";
import { ListField, SelectField, TagsField, TextareaField, TextField } from "@/components/forms/fields";
import { Form } from "@/components/ui/form";
import { useAction } from "@/hooks/use-action";
import type { ActionResult } from "@/lib/action-result";
import { ARRANGEMENTS, ARRANGEMENT_LABELS, EMPLOYMENT_TYPES, EMPLOYMENT_TYPE_LABELS } from "@/lib/constants";
import { templateSchema, type TemplateInput } from "@/lib/validation";

/** Shared by recruiters (company templates) and admins (system templates); the save action decides the scope. */
export function TemplateForm({
  defaults,
  categories,
  save,
  returnTo,
}: {
  defaults: TemplateInput;
  categories: { id: string; name: string }[];
  save: (input: TemplateInput) => Promise<ActionResult>;
  returnTo: string;
}) {
  const router = useRouter();
  const form = useForm<TemplateInput>({ resolver: zodResolver(templateSchema), defaultValues: defaults });
  const { pending, run } = useAction();
  return (
    <Form {...form}>
      <form
        method="post"
        noValidate
        className="grid gap-5 sm:grid-cols-2"
        onSubmit={form.handleSubmit((values) => run(() => save(values), { form, onSuccess: () => router.push(returnTo) }))}
      >
        <TextField control={form.control} name="name" label="Template name" placeholder="Backend Engineer (Platform team)" />
        <TextField control={form.control} name="title" label="Default job title" />
        <SelectField
          control={form.control}
          name="categoryId"
          label="Category"
          placeholder="No default"
          options={categories.map((c) => ({ value: c.id, label: c.name }))}
        />
        <SelectField
          control={form.control}
          name="employmentType"
          label="Employment type"
          placeholder="No default"
          options={EMPLOYMENT_TYPES.map((v) => ({ value: v, label: EMPLOYMENT_TYPE_LABELS[v] }))}
        />
        <SelectField
          control={form.control}
          name="arrangement"
          label="Work arrangement"
          placeholder="No default"
          options={ARRANGEMENTS.map((v) => ({ value: v, label: ARRANGEMENT_LABELS[v] }))}
        />
        <TextareaField className="sm:col-span-2" control={form.control} name="description" label="Description" rows={6} />
        <ListField className="sm:col-span-2" control={form.control} name="responsibilities" label="Responsibilities" optional />
        <ListField className="sm:col-span-2" control={form.control} name="requirements" label="Requirements" optional />
        <ListField className="sm:col-span-2" control={form.control} name="benefits" label="Benefits" optional />
        <TagsField className="sm:col-span-2" control={form.control} name="skills" label="Skills" optional max={20} />
        <ListField
          className="sm:col-span-2"
          control={form.control}
          name="screeningQuestions"
          label="Screening questions"
          optional
          rows={3}
          description="Up to 5 questions, one per line."
        />
        <div className="sm:col-span-2">
          <SubmitButton pending={pending} size="lg">
            Save template
          </SubmitButton>
        </div>
      </form>
    </Form>
  );
}
