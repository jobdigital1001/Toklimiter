"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Flag } from "lucide-react";
import { useForm } from "react-hook-form";
import { reportJobAction } from "@/actions/candidate";
import { SubmitButton } from "@/components/action-buttons";
import { SelectField, TextareaField } from "@/components/forms/fields";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { useAction } from "@/hooks/use-action";
import { REPORT_REASONS } from "@/lib/constants";
import { reportSchema, type ReportInput } from "@/lib/validation";

export function ReportJobButton({ jobId }: { jobId: string }) {
  const [open, setOpen] = useState(false);
  const { pending, run } = useAction();
  const form = useForm<ReportInput>({
    resolver: zodResolver(reportSchema),
    defaultValues: { reason: REPORT_REASONS[0], details: "" },
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground">
          <Flag />
          Report this job
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report this job</DialogTitle>
          <DialogDescription>Tell us what’s wrong. Reports are reviewed by our team and are not shared with the company.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            method="post"
            noValidate
            className="space-y-4"
            onSubmit={form.handleSubmit((values) =>
              run(() => reportJobAction(jobId, values), {
                form,
                onSuccess: () => {
                  setOpen(false);
                  form.reset();
                },
              }),
            )}
          >
            <SelectField control={form.control} name="reason" label="Reason" options={REPORT_REASONS.map((r) => ({ value: r, label: r }))} />
            <TextareaField control={form.control} name="details" label="Details" optional rows={4} />
            <DialogFooter>
              <SubmitButton pending={pending}>Send report</SubmitButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
