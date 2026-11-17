"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";
import { signOutAction } from "@/actions/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { initials } from "@/lib/utils";

type MenuUser = { name: string | null; email: string; image: string | null; role: "CANDIDATE" | "RECRUITER" | "ADMIN" };

const ROLE_LINKS: Record<MenuUser["role"], { href: string; label: string }[]> = {
  CANDIDATE: [
    { href: "/account", label: "Profile" },
    { href: "/account/applications", label: "Applications" },
    { href: "/account/saved", label: "Saved jobs" },
    { href: "/account/alerts", label: "Job alerts" },
  ],
  RECRUITER: [
    { href: "/recruiter", label: "Dashboard" },
    { href: "/recruiter/jobs", label: "Jobs" },
    { href: "/recruiter/company", label: "Company profile" },
    { href: "/recruiter/templates", label: "Templates" },
  ],
  ADMIN: [
    { href: "/admin", label: "Admin overview" },
    { href: "/admin/users", label: "Users" },
    { href: "/admin/jobs", label: "Jobs" },
    { href: "/admin/reports", label: "Reports" },
  ],
};

export function UserMenu({ user }: { user: MenuUser }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full" aria-label="Account menu">
        <Avatar className="size-9">
          {user.image && <AvatarImage src={user.image} alt="" />}
          <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
            {initials(user.name ?? user.email)}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate text-sm font-medium">{user.name ?? "Your account"}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {ROLE_LINKS[user.role].map((l) => (
          <DropdownMenuItem key={l.href} asChild>
            <Link href={l.href}>{l.label}</Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <form action={signOutAction}>
          <DropdownMenuItem asChild>
            <button type="submit" className="w-full">
              <LogOut />
              Sign out
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
