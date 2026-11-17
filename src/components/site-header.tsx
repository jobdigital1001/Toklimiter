import Link from "next/link";
import { Logo } from "@/components/logo";
import { MobileNav } from "@/components/mobile-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";

const LINKS = [
  { href: "/jobs", label: "Find jobs" },
  { href: "/companies", label: "Companies" },
  { href: "/for-companies", label: "For companies" },
];

export async function SiteHeader() {
  const [user, settings] = await Promise.all([getCurrentUser(), getSettings()]);
  const menuUser = user ? { name: user.name, email: user.email, image: user.image, role: user.role } : null;
  return (
    <>
      {settings.announcement && (
        <div role="status" className="bg-primary px-4 py-2 text-center text-sm text-primary-foreground">
          {settings.announcement}
        </div>
      )}
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md">
        <div className="container-page flex h-16 items-center gap-6">
          <Logo />
          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1.5">
            <ThemeToggle />
            {menuUser ? (
              <UserMenu user={menuUser} />
            ) : (
              <div className="hidden items-center gap-1.5 md:flex">
                <Button asChild variant="ghost">
                  <Link href="/sign-in">Sign in</Link>
                </Button>
                <Button asChild>
                  <Link href="/sign-up">Get started</Link>
                </Button>
              </div>
            )}
            <MobileNav links={LINKS} signedIn={Boolean(user)} />
          </div>
        </div>
      </header>
    </>
  );
}
