"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { saveCategoryAction, saveSettingsAction, setUserRoleAction } from "@/actions/admin";
import { SubmitButton } from "@/components/action-buttons";
import { CATEGORY_ICONS } from "@/components/category-icon";
import { NumberField, SelectField, SwitchField, TextField } from "@/components/forms/fields";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { NativeSelect } from "@/components/ui/native-select";
import { useAction } from "@/hooks/use-action";
import { ROLES } from "@/lib/constants";
import { categorySchema, settingsSchema, type CategoryInput, type SettingsInput } from "@/lib/validation";

const ROLE_LABELS = { CANDIDATE: "Candidate", RECRUITER: "Recruiter", ADMIN: "Admin" } as const;

export function RoleSelect({ userId, role, name }: { userId: string; role: (typeof ROLES)[number]; name: string }) {
  const router = useRouter();
  const { pending, run } = useAction();
  return (
    <NativeSelect
      aria-label={`Role for ${name}`}
      className="h-9 w-36"
      value={role}
      disabled={pending}
      onChange={(e) => run(() => setUserRoleAction(userId, e.target.value), { onSuccess: () => router.refresh() })}
    >
      {ROLES.map((r) => (
        <option key={r} value={r}>
          {ROLE_LABELS[r]}
        </option>
      ))}
    </NativeSelect>
  );
}

export function CategoryDialog({ category }: { category?: CategoryInput & { id: string } }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { pending, run } = useAction();
  const form = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema),
    values: category ? { name: category.name, description: category.description, icon: category.icon } : { name: "", description: "", icon: "briefcase" },
  });
  return (
    <>
      {category ? (
        <Button variant="ghost" size="sm" onClick={() => setOpen(true)} aria-label={`Edit ${category.name}`}>
          <Pencil /> Edit
        </Button>
      ) : (
        <Button onClick={() => setOpen(true)}>
          <Plus /> New category
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{category ? "Edit category" : "New category"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              method="post"
              noValidate
              className="space-y-4"
              onSubmit={form.handleSubmit((values) =>
                run(() => saveCategoryAction(category?.id ?? null, values), {
                  form,
                  onSuccess: () => {
                    setOpen(false);
                    if (!category) form.reset();
                    router.refresh();
                  },
                }),
              )}
            >
              <TextField control={form.control} name="name" label="Name" />
              <TextField control={form.control} name="description" label="Description" optional />
              <SelectField
                control={form.control}
                name="icon"
                label="Icon"
                options={Object.keys(CATEGORY_ICONS).map((k) => ({ value: k, label: k[0].toUpperCase() + k.slice(1) }))}
              />
              <DialogFooter>
                <SubmitButton pending={pending}>Save category</SubmitButton>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function SettingsForm({ defaults }: { defaults: SettingsInput }) {
  const router = useRouter();
  const form = useForm<SettingsInput>({ resolver: zodResolver(settingsSchema), defaultValues: defaults });
  const { pending, run } = useAction();
  return (
    <Form {...form}>
      <form
        method="post"
        noValidate
        className="max-w-xl space-y-5"
        onSubmit={form.handleSubmit((values) =>
          run(() => saveSettingsAction(values), {
            form,
            onSuccess: () => {
              form.reset(values);
              router.refresh();
            },
          }),
        )}
      >
        <TextField control={form.control} name="supportEmail" label="Support email" type="email" description="Shown in the site footer and legal pages." />
        <TextField
          control={form.control}
          name="announcement"
          label="Announcement banner"
          optional
          description="Shown at the top of every page. Leave empty to hide."
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <NumberField control={form.control} name="featuredJobsLimit" label="Featured jobs on home page" min={1} max={24} />
          <NumberField control={form.control} name="jobsPerPage" label="Jobs per results page" min={5} max={50} />
        </div>
        <SwitchField
          control={form.control}
          name="allowRegistrations"
          label="Allow new registrations"
          description="Turn off to stop new email sign-ups. Existing users can still sign in."
        />
        <SubmitButton pending={pending} size="lg">
          Save settings
        </SubmitButton>
      </form>
    </Form>
  );
}
