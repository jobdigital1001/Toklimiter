"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { signIn, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function SignInButton() {
  const [pending, setPending] = useState(false);
  return (
    <Button
      className="w-full sm:w-auto"
      disabled={pending}
      onClick={() => {
        setPending(true);
        void signIn("github", { callbackUrl: "/audit" });
      }}
    >
      {pending ? "Redirecting to GitHub…" : "Sign in with GitHub"}
    </Button>
  );
}

export function SignOutButton() {
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Sign out"
      onClick={() => void signOut({ callbackUrl: "/" })}
    >
      <LogOut aria-hidden="true" />
    </Button>
  );
}
