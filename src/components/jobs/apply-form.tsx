"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { FileText, Upload } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { applyToJobAction } from "@/actions/candidate";
import { SubmitButton } from "@/components/action-buttons";
import { TextareaField, TextField } from "@/components/forms/fields";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { useAction } from "@/hooks/use-action";
import { CV_EXTENSIONS, CV_MAX_BYTES } from "@/lib/constants";
import { applicationSchema, type ApplicationInput } from "@/lib/validation";

export function ApplyForm({
  jobId,
  companyName,
  questions,
  defaults,
  profileCvName,
}: {
  jobId: string;
  companyName: string;
  questions: string[];
  defaults: { fullName: string; email: string; phone: string; linkUrl: string };
  profileCvName: string | null;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [cvError, setCvError] = useState<string | null>(null);
  const { pending, run } = useAction();

  const form = useForm<ApplicationInput>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      ...defaults,
      coverLetter: "",
      answers: questions.map(() => ""),
      useProfileCv: Boolean(profileCvName),
      consent: false,
    },
  });
  const useProfileCv = useWatch({ control: form.control, name: "useProfileCv" });

  const submitValues = (values: ApplicationInput) => {
    setCvError(null);
    let hasError = false;
    questions.forEach((_, i) => {
      if (!values.answers[i]?.trim()) {
        form.setError(`answers.${i}`, { message: "Please answer this question" });
        hasError = true;
      }
    });
    const file = fileRef.current?.files?.[0];
    if (!values.useProfileCv) {
      if (!file) {
        setCvError("Attach your CV to apply.");
        hasError = true;
      } else if (file.size > CV_MAX_BYTES) {
        setCvError("Your CV must be 4 MB or smaller.");
        hasError = true;
      }
    }
    if (hasError) return;

    const data = new FormData();
    data.set("payload", JSON.stringify(values));
    if (!values.useProfileCv && file) data.set("cv", file);
    run(() => applyToJobAction(jobId, data), {
      form,
      onSuccess: () => router.refresh(),
    });
  };
  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => form.handleSubmit(submitValues)(event);

  return (
    <Form {...form}>
      <form method="post" noValidate onSubmit={onSubmit} className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField control={form.control} name="fullName" label="Full name" autoComplete="name" />
          <TextField control={form.control} name="email" label="Email" type="email" autoComplete="email" />
          <TextField control={form.control} name="phone" label="Phone number" type="tel" autoComplete="tel" placeholder="+1 555 010 1234" />
          <TextField
            control={form.control}
            name="linkUrl"
            label="Link"
            optional
            type="url"
            placeholder="https://linkedin.com/in/you"
            description="LinkedIn, portfolio, or GitHub."
          />
        </div>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">CV / résumé</legend>
          {profileCvName && (
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                { value: true, title: "Use my profile CV", detail: profileCvName, icon: FileText },
                { value: false, title: "Upload a different file", detail: "PDF, DOC, or DOCX up to 4 MB", icon: Upload },
              ].map((option) => (
                <label
                  key={String(option.value)}
                  className="flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 text-sm has-checked:border-primary has-checked:bg-accent/50"
                >
                  <input
                    type="radio"
                    name="cv-source"
                    className="mt-1 accent-primary"
                    checked={useProfileCv === option.value}
                    onChange={() => form.setValue("useProfileCv", option.value)}
                  />
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 font-medium">
                      <option.icon className="size-3.5" />
                      {option.title}
                    </span>
                    <span className="block truncate text-muted-foreground">{option.detail}</span>
                  </span>
                </label>
              ))}
            </div>
          )}
          {!useProfileCv && (
            <div>
              <Label htmlFor="cv-file" className="sr-only">
                Upload CV
              </Label>
              <input
                id="cv-file"
                ref={fileRef}
                type="file"
                accept={CV_EXTENSIONS.join(",")}
                aria-invalid={Boolean(cvError)}
                aria-describedby="cv-help"
                onChange={(e) => {
                  setFileName(e.target.files?.[0]?.name ?? null);
                  setCvError(null);
                }}
                className="block w-full cursor-pointer rounded-xl border border-dashed p-3 text-sm text-muted-foreground file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-secondary-foreground"
              />
              <p id="cv-help" className="mt-1.5 text-sm text-muted-foreground">
                {fileName ? `Selected: ${fileName}` : "PDF, DOC, or DOCX up to 4 MB."}
              </p>
            </div>
          )}
          {cvError && (
            <p role="alert" className="text-sm text-destructive">
              {cvError}
            </p>
          )}
        </fieldset>

        <TextareaField
          control={form.control}
          name="coverLetter"
          label="Cover letter"
          optional
          rows={6}
          placeholder={`Tell ${companyName} why this role is a great fit for you.`}
        />

        {questions.map((question, i) => (
          <TextareaField key={i} control={form.control} name={`answers.${i}`} label={question} rows={3} />
        ))}

        <FormField
          control={form.control}
          name="consent"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-start gap-3">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} className="mt-0.5" />
                </FormControl>
                <FormLabel className="leading-5 font-normal">
                  I agree to share this application and my CV with {companyName}.
                </FormLabel>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <SubmitButton pending={pending} size="lg" className="w-full sm:w-auto">
          Submit application
        </SubmitButton>
      </form>
    </Form>
  );
}
