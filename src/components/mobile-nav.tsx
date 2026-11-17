"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export function MobileNav({ links, signedIn }: { links: { href: string; label: string }[]; signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[85vw] max-w-xs">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>
        <nav aria-label="Mobile" className="flex flex-col gap-1 px-4">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-3 text-base font-medium hover:bg-accent"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        {!signedIn && (
          <div className="mt-4 grid gap-2 px-4">
            <Button asChild size="lg">
              <Link href="/sign-up" onClick={() => setOpen(false)}>
                Get started
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/sign-in" onClick={() => setOpen(false)}>
                Sign in
              </Link>
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
