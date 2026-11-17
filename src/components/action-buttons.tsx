"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useAction } from "@/hooks/use-action";
import type { ActionResult } from "@/lib/action-result";

type ButtonProps = Omit<React.ComponentProps<typeof Button>, "onClick">;

type Props = ButtonProps & {
  action: () => Promise<ActionResult<unknown>>;
  /** Navigate here after success instead of refreshing in place. */
  redirectTo?: string;
};

/** Button that runs a server action, shows a toast and refreshes the current route. */
export function ActionButton({ action, redirectTo, children, disabled, ...props }: Props) {
  const router = useRouter();
  const { pending, run } = useAction();
  return (
    <Button
      {...props}
      disabled={disabled || pending}
      onClick={() => run(action, { onSuccess: () => (redirectTo ? router.push(redirectTo) : router.refresh()) })}
    >
      {pending && <Loader2 className="animate-spin" />}
      {children}
    </Button>
  );
}

/** Same as ActionButton, but asks for confirmation first. Use for destructive or hard-to-undo actions. */
export function ConfirmActionButton({
  action,
  redirectTo,
  children,
  title,
  description,
  confirmLabel = "Confirm",
  destructive = true,
  ...props
}: Props & { title: string; description: string; confirmLabel?: string; destructive?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { pending, run } = useAction();
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button {...props}>{children}</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <Button
            variant={destructive ? "destructive" : "default"}
            disabled={pending}
            onClick={() =>
              run(action, {
                onSuccess: () => {
                  setOpen(false);
                  if (redirectTo) router.push(redirectTo);
                  else router.refresh();
                },
              })
            }
          >
            {pending && <Loader2 className="animate-spin" />}
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function SubmitButton({
  pending,
  children,
  ...props
}: React.ComponentProps<typeof Button> & { pending: boolean }) {
  return (
    <Button type="submit" disabled={pending || props.disabled} {...props}>
      {pending && <Loader2 className="animate-spin" />}
      {children}
    </Button>
  );
}
