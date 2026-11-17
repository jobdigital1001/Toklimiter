import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("size-8", className)}>
      <rect width="32" height="32" rx="9" className="fill-primary" />
      <path
        d="M16 6.5c.6 4.9 2.3 7.4 7.5 9.5-5.2 2.100-6.900 4.600-7.500 9.500-.600-4.900-2.300-7.400-7.500-9.500 5.200-2.100 6.900-4.600 7.500-9.500Z"
        className="fill-primary-foreground"
      />
      <circle cx="24" cy="8.500" r="1.800" className="fill-spark" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2.5 rounded-md", className)} aria-label="Genius JobPortal home">
      <LogoMark />
      <span className="text-[1.05rem] leading-none font-semibold tracking-tight">
        Genius<span className="font-normal text-muted-foreground"> JobPortal</span>
      </span>
    </Link>
  );
}
