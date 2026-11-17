"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { BellPlus } from "lucide-react";
import { useForm } from "react-hook-form";
import { saveAlertAction } from "@/actions/candidate";
import { SubmitButton } from "@/components/action-buttons";
import { SelectField, TextField } from "@/components/forms/fields";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { useAction } from "@/hooks/use-action";
import { alertSchema, type AlertInput } from "@/lib/validation";

export function CreateAlertButton({
  criteria,
  suggestedName,
  signedIn,
  isCandidate,
}: {
  criteria: Omit<AlertInput, "name" | "frequency">;
  suggestedName: string;
  signedIn: boolean;
  isCandidate: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { pending, run } = useAction();
  const form = useForm<AlertInput>({
    resolver: zodResolver(alertSchema),
    values: { ...criteria, name: suggestedName, frequency: "WEEKLY" },
  });

  if (signedIn && !isCandidate) return null;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => (signedIn ? setOpen(true) : router.push(`/sign-in?next=${encodeURIComponent(pathname)}`))}
      >
        <BellPlus />
        Create job alert
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a job alert</DialogTitle>
            <DialogDescription>We’ll email you when new jobs match this search.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              method="post"
              noValidate
              className="space-y-4"
              onSubmit={form.handleSubmit((values) =>
                run(() => saveAlertAction(null, values), { form, onSuccess: () => setOpen(false) }),
              )}
            >
              <TextField control={form.control} name="name" label="Alert name" />
              <SelectField
                control={form.control}
                name="frequency"
                label="Email me"
                options={[
                  { value: "DAILY", label: "Daily" },
                  { value: "WEEKLY", label: "Weekly" },
                ]}
              />
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <SubmitButton pending={pending}>Create alert</SubmitButton>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
