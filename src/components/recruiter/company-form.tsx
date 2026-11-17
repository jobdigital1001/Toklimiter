"use client";

import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { saveCompanyAction } from "@/actions/recruiter";
import { SubmitButton } from "@/components/action-buttons";
import { ListField, SelectField, TextareaField, TextField } from "@/components/forms/fields";
import { Form } from "@/components/ui/form";
import { useAction } from "@/hooks/use-action";
import { COMPANY_SIZES, INDUSTRIES } from "@/lib/constants";
import { companySchema, type CompanyInput } from "@/lib/validation";

export function CompanyForm({ defaults, isNew }: { defaults: CompanyInput; isNew: boolean }) {
  const router = useRouter();
  const form = useForm<CompanyInput>({ resolver: zodResolver(companySchema), defaultValues: defaults });
  const { pending, run } = useAction();
  const industries = INDUSTRIES.includes(defaults.industry as (typeof INDUSTRIES)[number]) || !defaults.industry ? INDUSTRIES : [defaults.industry, ...INDUSTRIES];
  return (
    <Form {...form}>
      <form
        method="post"
        noValidate
        className="space-y-10"
        onSubmit={form.handleSubmit((values) =>
          run(() => saveCompanyAction(values), {
            form,
            onSuccess: () => {
              form.reset(values);
              if (isNew) router.push("/recruiter");
              else router.refresh();
            },
          }),
        )}
      >
        <fieldset className="grid gap-5 sm:grid-cols-2">
          <legend className="mb-4 text-lg font-semibold">Basics</legend>
          <TextField control={form.control} name="name" label="Company name" />
          <TextField control={form.control} name="tagline" label="Tagline" optional placeholder="One line on what you do" />
          <TextField control={form.control} name="location" label="Headquarters" placeholder="San Francisco, CA" />
          <TextField control={form.control} name="website" label="Website" optional type="url" placeholder="https://" />
          <SelectField control={form.control} name="industry" label="Industry" placeholder="Choose an industry" options={industries.map((i) => ({ value: i, label: i }))} />
          <SelectField control={form.control} name="size" label="Company size" options={COMPANY_SIZES.map((s) => ({ value: s, label: `${s} people` }))} />
          <TextareaField className="sm:col-span-2" control={form.control} name="description" label="About the company" rows={6} />
        </fieldset>

        <fieldset className="grid gap-5 sm:grid-cols-2">
          <legend className="mb-4 text-lg font-semibold">Culture and innovation</legend>
          <TextareaField
            className="sm:col-span-2"
            control={form.control}
            name="culture"
            label="Company culture"
            optional
            rows={5}
            placeholder="How does your team work together? What do you value?"
          />
          <ListField
            className="sm:col-span-2"
            control={form.control}
            name="highlights"
            label="Innovation highlights"
            optional
            rows={4}
            description="Up to 8 short highlights, one per line."
            placeholder={"Shipped the first open-source …\nBacked by …"}
          />
        </fieldset>

        <fieldset className="grid gap-5 sm:grid-cols-2">
          <legend className="mb-4 text-lg font-semibold">Brand and links</legend>
          <TextField control={form.control} name="logoUrl" label="Logo URL" optional type="url" description="Square image, at least 200×200." />
          <TextField control={form.control} name="bannerUrl" label="Banner URL" optional type="url" description="Wide image, around 1600×400." />
          <TextField control={form.control} name="linkedinUrl" label="LinkedIn" optional type="url" />
          <TextField control={form.control} name="twitterUrl" label="X / Twitter" optional type="url" />
          <TextField control={form.control} name="githubUrl" label="GitHub" optional type="url" />
        </fieldset>

        <SubmitButton pending={pending} size="lg">
          {isNew ? "Create company profile" : "Save changes"}
        </SubmitButton>
      </form>
    </Form>
  );
}
