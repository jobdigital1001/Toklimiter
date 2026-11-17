"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import {
  deleteEducationAction,
  deleteExperienceAction,
  saveEducationAction,
  saveExperienceAction,
} from "@/actions/candidate";
import { ConfirmActionButton, SubmitButton } from "@/components/action-buttons";
import { NumberField, TextareaField, TextField } from "@/components/forms/fields";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { useAction } from "@/hooks/use-action";
import { educationSchema, experienceSchema, type EducationInput, type ExperienceInput } from "@/lib/validation";

export type ExperienceItem = ExperienceInput & { id: string };
export type EducationItem = EducationInput & { id: string };

const EMPTY_EXPERIENCE: ExperienceInput = { title: "", company: "", location: "", startDate: "", endDate: "", description: "" };
const EMPTY_EDUCATION: EducationInput = { school: "", degree: "", field: "", startYear: new Date().getFullYear() - 4, endYear: null };

function formatMonth(value: string) {
  if (!value) return "Present";
  const [y, m] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

function SectionShell({ title, addLabel, onAdd, empty, children }: { title: string; addLabel: string; onAdd: () => void; empty: boolean; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        <Button variant="outline" size="sm" onClick={onAdd}>
          <Plus />
          {addLabel}
        </Button>
      </div>
      {empty ? <p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">Nothing added yet.</p> : children}
    </section>
  );
}

export function ExperienceSection({ items }: { items: ExperienceItem[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<ExperienceItem | "new" | null>(null);
  const { pending, run } = useAction();
  const current = editing && editing !== "new" ? editing : null;
  const form = useForm<ExperienceInput>({
    resolver: zodResolver(experienceSchema),
    values: current ? { ...current } : EMPTY_EXPERIENCE,
  });

  return (
    <SectionShell title="Experience" addLabel="Add experience" onAdd={() => setEditing("new")} empty={items.length === 0}>
      <ul className="divide-y rounded-xl border">
        {items.map((item) => (
          <li key={item.id} className="flex items-start justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="font-medium">{item.title}</p>
              <p className="text-sm text-muted-foreground">
                {item.company}
                {item.location && ` · ${item.location}`}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatMonth(item.startDate)} – {formatMonth(item.endDate)}
              </p>
              {item.description && <p className="mt-2 text-sm leading-6 whitespace-pre-line text-foreground/80">{item.description}</p>}
            </div>
            <Button variant="ghost" size="icon-sm" aria-label={`Edit ${item.title}`} onClick={() => setEditing(item)}>
              <Pencil />
            </Button>
          </li>
        ))}
      </ul>
      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{current ? "Edit experience" : "Add experience"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              method="post"
              noValidate
              className="grid gap-4 sm:grid-cols-2"
              onSubmit={form.handleSubmit((values) =>
                run(() => saveExperienceAction(current?.id ?? null, values), {
                  form,
                  onSuccess: () => {
                    setEditing(null);
                    router.refresh();
                  },
                }),
              )}
            >
              <TextField control={form.control} name="title" label="Job title" />
              <TextField control={form.control} name="company" label="Company" />
              <TextField className="sm:col-span-2" control={form.control} name="location" label="Location" optional />
              <TextField control={form.control} name="startDate" label="Start" type="month" />
              <TextField control={form.control} name="endDate" label="End" type="month" description="Leave empty if current." />
              <TextareaField className="sm:col-span-2" control={form.control} name="description" label="Description" optional rows={4} />
              <DialogFooter className="sm:col-span-2 sm:justify-between">
                {current ? (
                  <ConfirmActionButton
                    type="button"
                    variant="ghost"
                    className="text-destructive"
                    action={() => deleteExperienceAction(current.id)}
                    title="Delete this experience?"
                    description="This can’t be undone."
                    confirmLabel="Delete"
                  >
                    Delete
                  </ConfirmActionButton>
                ) : (
                  <span />
                )}
                <SubmitButton pending={pending}>Save</SubmitButton>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </SectionShell>
  );
}

export function EducationSection({ items }: { items: EducationItem[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<EducationItem | "new" | null>(null);
  const { pending, run } = useAction();
  const current = editing && editing !== "new" ? editing : null;
  const form = useForm<EducationInput>({
    resolver: zodResolver(educationSchema),
    values: current ? { ...current } : EMPTY_EDUCATION,
  });

  return (
    <SectionShell title="Education" addLabel="Add education" onAdd={() => setEditing("new")} empty={items.length === 0}>
      <ul className="divide-y rounded-xl border">
        {items.map((item) => (
          <li key={item.id} className="flex items-start justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="font-medium">{item.school}</p>
              <p className="text-sm text-muted-foreground">
                {item.degree}
                {item.field && `, ${item.field}`}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {item.startYear} – {item.endYear ?? "Present"}
              </p>
            </div>
            <Button variant="ghost" size="icon-sm" aria-label={`Edit ${item.school}`} onClick={() => setEditing(item)}>
              <Pencil />
            </Button>
          </li>
        ))}
      </ul>
      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{current ? "Edit education" : "Add education"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              method="post"
              noValidate
              className="grid gap-4 sm:grid-cols-2"
              onSubmit={form.handleSubmit((values) =>
                run(() => saveEducationAction(current?.id ?? null, values), {
                  form,
                  onSuccess: () => {
                    setEditing(null);
                    router.refresh();
                  },
                }),
              )}
            >
              <TextField className="sm:col-span-2" control={form.control} name="school" label="School" />
              <TextField control={form.control} name="degree" label="Degree" placeholder="BSc" />
              <TextField control={form.control} name="field" label="Field of study" optional />
              <NumberField control={form.control} name="startYear" label="Start year" />
              <NumberField control={form.control} name="endYear" label="End year" optional />
              <DialogFooter className="sm:col-span-2 sm:justify-between">
                {current ? (
                  <ConfirmActionButton
                    type="button"
                    variant="ghost"
                    className="text-destructive"
                    action={() => deleteEducationAction(current.id)}
                    title="Delete this education entry?"
                    description="This can’t be undone."
                    confirmLabel="Delete"
                  >
                    Delete
                  </ConfirmActionButton>
                ) : (
                  <span />
                )}
                <SubmitButton pending={pending}>Save</SubmitButton>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </SectionShell>
  );
}
