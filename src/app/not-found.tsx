import Link from "next/link";
import { LogoMark } from "@/components/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <LogoMark className="size-12" />
      <p className="mt-8 font-mono text-sm text-primary">404</p>
      <h1 className="mt-2 text-3xl font-semibold">We couldn’t find that page</h1>
      <p className="mt-3 max-w-sm text-muted-foreground">It may have moved, or the role may have been filled.</p>
      <div className="mt-8 flex gap-3">
        <Button asChild>
          <Link href="/jobs">Browse jobs</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Go home</Link>
        </Button>
      </div>
    </main>
  );
}
