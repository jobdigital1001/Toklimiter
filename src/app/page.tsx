import { redirect } from "next/navigation";
import { SignInButton } from "@/components/auth-buttons";
import { ThemeToggle } from "@/components/theme-toggle";
import { Alert } from "@/components/ui/alert";
import { getCurrentUser } from "@/lib/auth";

const steps = [
  { title: "Choose repository", body: "Pick one GitHub repository you have granted access to." },
  { title: "Add task", body: "Paste your prompt or upload a task.md, then set patterns and a token budget." },
  { title: "Review context pack", body: "See the token estimate and waste findings, then copy a minimal pack into Claude Code." },
];

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await getCurrentUser()) redirect("/audit");
  const { error } = await searchParams;

  return (
    <>
      <header className="mx-auto flex w-full max-w-2xl items-center justify-between px-4 py-3">
        <span className="text-lg font-semibold">ContextBudget</span>
        <ThemeToggle />
      </header>
      <main id="main" className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 pb-12 pt-6">
        <div className="flex flex-col gap-4">
          <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            Stop paying for context Claude Code doesn&apos;t need.
          </h1>
          <p className="text-lg text-muted-foreground">
            Estimate tokens, find waste, and generate a minimal context pack before you send a
            coding task.
          </p>
        </div>

        {error ? (
          <Alert variant="destructive" role="alert">
            Sign-in did not complete. Please try again.
          </Alert>
        ) : null}

        <SignInButton />

        <ol className="flex flex-col gap-4">
          {steps.map((step, index) => (
            <li key={step.title} className="flex gap-4">
              <span
                aria-hidden="true"
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent font-semibold text-accent-foreground"
              >
                {index + 1}
              </span>
              <div>
                <h2 className="font-semibold">{step.title}</h2>
                <p className="text-muted-foreground">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <p className="text-sm text-muted-foreground">
          Privacy first: read-only GitHub access, secret files are never read, repository code is
          never executed, and nothing is sent to third parties unless you turn on Anthropic token
          counting with your own key.
        </p>
      </main>
    </>
  );
}
