import Link from "next/link";
import { Logo } from "@/components/logo";
import { NewsletterForm } from "@/components/newsletter-form";
import { SITE } from "@/lib/constants";
import { getSettings } from "@/lib/settings";

const COLUMNS = [
  {
    title: "Candidates",
    links: [
      { href: "/jobs", label: "Browse jobs" },
      { href: "/companies", label: "Companies" },
      { href: "/account/saved", label: "Saved jobs" },
      { href: "/account/alerts", label: "Job alerts" },
    ],
  },
  {
    title: "Companies",
    links: [
      { href: "/for-companies", label: "Why Genius" },
      { href: "/recruiter/jobs/new", label: "Post a job" },
      { href: "/recruiter", label: "Recruiter dashboard" },
    ],
  },
  {
    title: "Platform",
    links: [
      { href: "/sign-in", label: "Sign in" },
      { href: "/sign-up", label: "Create account" },
      { href: "/legal/privacy", label: "Privacy" },
      { href: "/legal/terms", label: "Terms" },
    ],
  },
];

/* Brand glyphs are inlined because lucide-react no longer ships brand icons. */
const SOCIALS = [
  {
    label: "X (Twitter)",
    href: "https://x.com",
    path: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com",
    path: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.124 2.062 2.062 0 0 1 0 4.124zM7.119 20.452H3.555V9h3.564v11.452z",
  },
  {
    label: "GitHub",
    href: "https://github.com",
    path: "M12 .297c-6.630 0-12 5.373-12 12 0 5.303 3.438 9.800 8.205 11.385.600.113.820-.258.820-.577 0-.285-.010-1.040-.015-2.040-3.338.724-4.042-1.610-4.042-1.610C4.422 18.070 3.633 17.700 3.633 17.700c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.070 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.760-1.605-2.665-.300-5.466-1.332-5.466-5.930 0-1.310.465-2.380 1.235-3.220-.135-.303-.540-1.523.105-3.176 0 0 1.005-.322 3.300 1.230.960-.267 1.980-.399 3-.405 1.020.006 2.040.138 3 .405 2.280-1.552 3.285-1.230 3.285-1.230.645 1.653.240 2.873.120 3.176.765.840 1.230 1.910 1.230 3.220 0 4.610-2.805 5.625-5.475 5.920.420.360.810 1.096.810 2.220 0 1.606-.015 2.896-.015 3.286 0 .315.210.690.825.570C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12",
  },
];

export async function SiteFooter() {
  const settings = await getSettings();
  return (
    <footer className="mt-24 border-t bg-muted/40">
      <div className="container-page grid gap-12 py-14 lg:grid-cols-[1.3fr_2fr]">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-4 text-sm leading-6 text-muted-foreground">{SITE.description}</p>
          <h2 className="mt-8 text-sm font-semibold">Standout roles, once a week</h2>
          <p className="mt-1 mb-3 text-sm text-muted-foreground">A short digest. No spam, unsubscribe any time.</p>
          <NewsletterForm />
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h2 className="text-sm font-semibold">{col.title}</h2>
              <ul className="mt-4 space-y-3">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>
      <div className="border-t">
        <div className="container-page flex flex-col items-center justify-between gap-4 py-6 sm:flex-row">
          <p className="text-center text-sm text-muted-foreground sm:text-left">
            © {new Date().getFullYear()} {SITE.name}. Questions?{" "}
            <a href={`mailto:${settings.supportEmail}`} className="underline underline-offset-4 hover:text-foreground">
              {settings.supportEmail}
            </a>
          </p>
          <ul className="flex items-center gap-1">
            {SOCIALS.map((s) => (
              <li key={s.label}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <svg viewBox="0 0 24 24" className="size-[1.1rem] fill-current" aria-hidden="true">
                    <path d={s.path} />
                  </svg>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
