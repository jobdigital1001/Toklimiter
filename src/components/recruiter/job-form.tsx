"use client";

import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { saveJobAction } from "@/actions/recruiter";
import { SubmitButton } from "@/components/action-buttons";
import { ListField, NumberField, SelectField, TagsField, TextareaField, TextField } from "@/components/forms/fields";
import { Form } from "@/components/ui/form";
import { useAction } from "@/hooks/use-action";
import {
  ARRANGEMENTS,
  ARRANGEMENT_LABELS,
  EMPLOYMENT_TYPES,
  EMPLOYMENT_TYPE_LABELS,
  EXPERIENCE_LEVELS,
  EXPERIENCE_LEVEL_LABELS,
} from "@/lib/constants";
import { jobSchema, type JobInput } from "@/lib/validation";

const options = <T extends string>(values: readonly T[], labels: Record<T, string>) => values.map((v) => ({ value: v, label: labels[v] }));

export function JobForm({
  jobId,
  defaults,
  categories,
  isDraft,
}: {
  jobId: string | null;
  defaults: JobInput;
  categories: { id: string; name: string }[];
  isDraft: boolean;
}) {
  const router = useRouter();
  const form = useForm<JobInput>({ resolver: zodResolver(jobSchema), defaultValues: defaults });
  const { pending, run } = useAction();

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    // Which of the two submit buttons was pressed.
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
    const preview = submitter?.dataset.intent === "preview";
    return form.handleSubmit((values) => save(values, preview))(event);
  };

  const save = (values: JobInput, preview: boolean) =>
    run(() => saveJobAction(jobId, values), {
      form,
      onSuccess: ({ id }) => {
        form.reset(values);
        if (preview) router.push(`/recruiter/jobs/${id}/preview`);
        else if (!jobId) router.push(`/recruiter/jobs/${id}/edit`);
        else router.refresh();
      },
    });

  return (
    <Form {...form}>
      <form method="post" noValidate className="space-y-10" onSubmit={submit}>
        <fieldset className="grid gap-5 sm:grid-cols-2">
          <legend className="mb-4 text-lg font-semibold">Role</legend>
          <TextField className="sm:col-span-2" control={form.control} name="title" label="Job title" placeholder="Senior Software Engineer" />
          <SelectField
            control={form.control}
            name="categoryId"
            label="Category"
            placeholder="Choose a category"
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
          />
          <SelectField control={form.control} name="experienceLevel" label="Experience level" options={options(EXPERIENCE_LEVELS, EXPERIENCE_LEVEL_LABELS)} />
          <SelectField control={form.control} name="employmentType" label="Employment type" options={options(EMPLOYMENT_TYPES, EMPLOYMENT_TYPE_LABELS)} />
          <SelectField control={form.control} name="arrangement" label="Work arrangement" options={options(ARRANGEMENTS, ARRANGEMENT_LABELS)} />
          <TextField control={form.control} name="location" label="Location" placeholder="Berlin, Germany or Worldwide" />
          <TextField control={form.control} name="deadline" label="Application deadline" optional type="date" />
        </fieldset>

        <fieldset className="grid gap-5 sm:grid-cols-3">
          <legend className="mb-4 text-lg font-semibold">Compensation</legend>
          <NumberField control={form.control} name="salaryMin" label="Minimum salary" optional placeholder="90000" description="Per year." />
          <NumberField control={form.control} name="salaryMax" label="Maximum salary" optional placeholder="130000" description="Per year." />
          <SelectField
            control={form.control}
            name="currency"
            label="Currency"
            options={["USD", "EUR", "GBP", "CAD", "AUD"].map((c) => ({ value: c, label: c }))}
          />
        </fieldset>

        <fieldset className="grid gap-5">
          <legend className="mb-4 text-lg font-semibold">Description</legend>
          <TextareaField control={form.control} name="description" label="About the role" rows={8} />
          <ListField control={form.control} name="responsibilities" label="Responsibilities" optional />
          <ListField control={form.control} name="requirements" label="Requirements" optional />
          <ListField control={form.control} name="benefits" label="Benefits" optional />
          <TagsField control={form.control} name="skills" label="Skills" optional placeholder="e.g. React, Roadmapping" max={20} />
        </fieldset>

        <fieldset>
          <legend className="mb-4 text-lg font-semibold">Screening questions</legend>
          <ListField
            control={form.control}
            name="screeningQuestions"
            label="Questions for applicants"
            optional
            rows={4}
            description="Up to 5 questions, one per line. Applicants must answer each one."
            placeholder="Why are you interested in this role?"
          />
        </fieldset>

        <div className="sticky bottom-0 -mx-4 flex flex-wrap gap-3 border-t bg-background/95 px-4 py-4 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
          <SubmitButton pending={pending} size="lg" data-intent="preview">
            {isDraft ? "Save and preview" : "Save and view"}
          </SubmitButton>
          <SubmitButton pending={pending} size="lg" variant="outline" data-intent="save">
            {isDraft ? "Save draft" : "Save changes"}
          </SubmitButton>
        </div>
      </form>
    </Form>
  );
}
