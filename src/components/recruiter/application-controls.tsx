"use client";

import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { addNoteAction, deleteNoteAction, setApplicationStatusAction } from "@/actions/recruiter";
import { ConfirmActionButton, SubmitButton } from "@/components/action-buttons";
import { TextareaField } from "@/components/forms/fields";
import { Form } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { useAction } from "@/hooks/use-action";
import { APPLICATION_STATUSES, APPLICATION_STATUS_LABELS, type ApplicationStatusValue } from "@/lib/constants";
import { noteSchema } from "@/lib/validation";

export function StatusSelect({ applicationId, status }: { applicationId: string; status: ApplicationStatusValue }) {
  const router = useRouter();
  const { pending, run } = useAction();
  if (status === "WITHDRAWN") {
    return <p className="text-sm text-muted-foreground">The candidate withdrew this application, so its status can’t be changed.</p>;
  }
  return (
    <div className="space-y-1.5">
      <Label htmlFor="application-status">Application status</Label>
      <NativeSelect
        id="application-status"
        value={status}
        disabled={pending}
        onChange={(e) => run(() => setApplicationStatusAction(applicationId, e.target.value), { onSuccess: () => router.refresh() })}
      >
        {APPLICATION_STATUSES.filter((s) => s !== "WITHDRAWN").map((s) => (
          <option key={s} value={s}>
            {APPLICATION_STATUS_LABELS[s]}
          </option>
        ))}
      </NativeSelect>
      <p className="text-xs text-muted-foreground">The candidate is emailed when the status changes.</p>
    </div>
  );
}

export function NoteForm({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const form = useForm<z.infer<typeof noteSchema>>({ resolver: zodResolver(noteSchema), defaultValues: { body: "" } });
  const { pending, run } = useAction();
  return (
    <Form {...form}>
      <form
        method="post"
        noValidate
        className="space-y-3"
        onSubmit={form.handleSubmit((values) =>
          run(() => addNoteAction(applicationId, values), {
            form,
            onSuccess: () => {
              form.reset();
              router.refresh();
            },
          }),
        )}
      >
        <TextareaField control={form.control} name="body" label="Add a private note" rows={3} placeholder="Only your team can see notes." />
        <SubmitButton pending={pending} size="sm">
          Add note
        </SubmitButton>
      </form>
    </Form>
  );
}

export function DeleteNoteButton({ noteId }: { noteId: string }) {
  return (
    <ConfirmActionButton
      variant="ghost"
      size="xs"
      className="text-muted-foreground"
      action={() => deleteNoteAction(noteId)}
      title="Delete this note?"
      description="This can’t be undone."
      confirmLabel="Delete"
    >
      Delete
    </ConfirmActionButton>
  );
}
