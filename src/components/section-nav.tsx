"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type NavItem = { href: string; label: string; exact?: boolean; badge?: number };

/** Secondary navigation for account areas: horizontal scroller on mobile, sidebar on desktop. */
export function SectionNav({ items, label }: { items: NavItem[]; label: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label={label} className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:overflow-visible lg:px-0">
      <ul className="flex gap-1 border-b pb-2 lg:flex-col lg:border-b-0 lg:pb-0">
        {items.map((item) => {
          const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                  active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                )}
              >
                {item.label}
                {item.badge ? (
                  <span className="rounded-full bg-primary px-1.5 py-0.5 text-[0.7rem] leading-none font-semibold text-primary-foreground tabular-nums">
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function DashboardShell({ nav, children }: { nav: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="container-page grid gap-6 py-8 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-10 lg:py-12">
      <aside className="lg:sticky lg:top-24 lg:self-start">{nav}</aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
