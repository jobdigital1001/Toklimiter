import { redirect } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { SignOutButton } from "@/components/auth-buttons";
import { ThemeToggle } from "@/components/theme-toggle";
import { getCurrentUser } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  return (
    <>
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-4 py-2">
          <span className="text-lg font-semibold">ContextBudget</span>
          <div className="flex items-center">
            <ThemeToggle />
            <SignOutButton />
          </div>
        </div>
        <AppNav />
      </header>
      <main id="main" className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16 pt-6">
        {children}
      </main>
    </>
  );
}
