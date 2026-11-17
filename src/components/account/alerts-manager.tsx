"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { BellRing, Pencil, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { deleteAlertAction, saveAlertAction, toggleAlertAction } from "@/actions/candidate";
import { ConfirmActionButton, SubmitButton } from "@/components/action-buttons";
import { EmptyState } from "@/components/empty-state";
import { NumberField, SelectField, TextField } from "@/components/forms/fields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { useAction } from "@/hooks/use-action";
import {
  ARRANGEMENTS,
  ARRANGEMENT_LABELS,
  EMPLOYMENT_TYPES,
  EMPLOYMENT_TYPE_LABELS,
  EXPERIENCE_LEVELS,
  EXPERIENCE_LEVEL_LABELS,
} from "@/lib/constants";
import { alertSchema, type AlertInput } from "@/lib/validation";

export type AlertItem = AlertInput & { id: string; active: boolean; summary: string[]; searchHref: string };

const EMPTY: AlertInput = {
  name: "",
  q: "",
  location: "",
  categoryId: "",
  arrangement: "",
  employmentType: "",
  experienceLevel: "",
  salaryMin: null,
  frequency: "WEEKLY",
};

const options = <T extends string>(values: readonly T[], labels: Record<T, string>) => values.map((v) => ({ value: v, label: labels[v] }));

export function AlertsManager({ alerts, categories }: { alerts: AlertItem[]; categories: { id: string; name: string }[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<AlertItem | "new" | null>(null);
  const { pending, run } = useAction();
  const toggle = useAction();
  const current = editing && editing !== "new" ? editing : null;
  const form = useForm<AlertInput>({
    resolver: zodResolver(alertSchema),
    values: current
      ? {
          name: current.name,
          q: current.q,
          location: current.location,
          categoryId: current.categoryId,
          arrangement: current.arrangement,
          employmentType: current.employmentType,
          experienceLevel: current.experienceLevel,
          salaryMin: current.salaryMin,
          frequency: current.frequency,
        }
      : EMPTY,
  });

  return (
    <>
      <div className="mb-6 flex justify-end">
        <Button onClick={() => setEditing("new")}>
          <Plus />
          New alert
        </Button>
      </div>

      {alerts.length === 0 ? (
        <EmptyState
          icon={BellRing}
          title="No job alerts yet"
          description="Create an alert and we’ll email you when new roles match. You can also create one from any job search."
        />
      ) : (
        <ul className="space-y-3">
          {alerts.map((alert) => (
            <li key={alert.id} className="rounded-2xl border bg-card p-4 sm:p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-semibold">{alert.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{alert.frequency === "DAILY" ? "Daily" : "Weekly"} email</p>
                </div>
                <label className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
                  <span>{alert.active ? "Active" : "Paused"}</span>
                  <Switch
                    checked={alert.active}
                    disabled={toggle.pending}
                    aria-label={`${alert.active ? "Pause" : "Resume"} alert ${alert.name}`}
                    onCheckedChange={(checked) => toggle.run(() => toggleAlertAction(alert.id, checked), { onSuccess: () => router.refresh() })}
                  />
                </label>
              </div>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {alert.summary.length === 0 ? (
                  <li>
                    <Badge variant="secondary">All new jobs</Badge>
                  </li>
                ) : (
                  alert.summary.map((s) => (
                    <li key={s}>
                      <Badge variant="secondary">{s}</Badge>
                    </li>
                  ))
                )}
              </ul>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href={alert.searchHref}>View matching jobs</Link>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setEditing(alert)}>
                  <Pencil />
                  Edit
                </Button>
                <ConfirmActionButton
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  action={() => deleteAlertAction(alert.id)}
                  title={`Delete “${alert.name}”?`}
                  description="You’ll stop receiving emails for this alert."
                  confirmLabel="Delete"
                >
                  Delete
                </ConfirmActionButton>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{current ? "Edit job alert" : "New job alert"}</DialogTitle>
            <DialogDescription>Leave a field empty to match anything.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              method="post"
              noValidate
              className="grid gap-4 sm:grid-cols-2"
              onSubmit={form.handleSubmit((values) =>
                run(() => saveAlertAction(current?.id ?? null, values), {
                  form,
                  onSuccess: () => {
                    setEditing(null);
                    router.refresh();
                  },
                }),
              )}
            >
              <TextField className="sm:col-span-2" control={form.control} name="name" label="Alert name" placeholder="Remote design roles" />
              <TextField control={form.control} name="q" label="Keywords" optional />
              <TextField control={form.control} name="location" label="Location" optional />
              <SelectField
                control={form.control}
                name="categoryId"
                label="Category"
                placeholder="Any category"
                options={categories.map((c) => ({ value: c.id, label: c.name }))}
              />
              <SelectField control={form.control} name="arrangement" label="Work arrangement" placeholder="Any" options={options(ARRANGEMENTS, ARRANGEMENT_LABELS)} />
              <SelectField control={form.control} name="employmentType" label="Employment type" placeholder="Any" options={options(EMPLOYMENT_TYPES, EMPLOYMENT_TYPE_LABELS)} />
              <SelectField control={form.control} name="experienceLevel" label="Experience level" placeholder="Any" options={options(EXPERIENCE_LEVELS, EXPERIENCE_LEVEL_LABELS)} />
              <NumberField control={form.control} name="salaryMin" label="Minimum salary" optional placeholder="80000" />
              <SelectField
                control={form.control}
                name="frequency"
                label="Email me"
                options={[
                  { value: "DAILY", label: "Daily" },
                  { value: "WEEKLY", label: "Weekly" },
                ]}
              />
              <DialogFooter className="sm:col-span-2">
                <SubmitButton pending={pending}>{current ? "Save changes" : "Create alert"}</SubmitButton>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
