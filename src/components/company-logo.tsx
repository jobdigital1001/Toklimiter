import { cn, initials } from "@/lib/utils";

const TONES = [
  "bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-200",
  "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200",
  "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200",
  "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-200",
  "bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-200",
  "bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-200",
  "bg-teal-100 text-teal-800 dark:bg-teal-500/20 dark:text-teal-200",
];

function tone(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return TONES[hash % TONES.length];
}

const SIZES = { sm: "size-10 text-sm rounded-lg", md: "size-12 text-base rounded-xl", lg: "size-20 text-2xl rounded-2xl" };

export function CompanyLogo({
  name,
  logoUrl,
  size = "md",
  className,
}: {
  name: string;
  logoUrl?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  if (logoUrl) {
    return (
      // Logos come from arbitrary recruiter-provided hosts, so next/image remote patterns can't be enumerated.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={`${name} logo`}
        loading="lazy"
        referrerPolicy="no-referrer"
        className={cn("shrink-0 border bg-white object-contain", SIZES[size], className)}
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      className={cn("flex shrink-0 items-center justify-center font-semibold select-none", SIZES[size], tone(name), className)}
    >
      {initials(name)}
    </div>
  );
}
