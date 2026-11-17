import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { paginationRange } from "@/lib/search";
import { cn } from "@/lib/utils";

export function Pagination({
  page,
  totalPages,
  hrefFor,
}: {
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
}) {
  if (totalPages <= 1) return null;
  const range = paginationRange(page, totalPages);
  const item = (active = false) => cn(buttonVariants({ variant: active ? "default" : "outline", size: "icon" }), "tabular-nums");
  return (
    <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-1.5">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={item()} aria-label="Previous page" rel="prev">
          <ChevronLeft />
        </Link>
      ) : (
        <span className={cn(item(), "pointer-events-none opacity-40")} aria-hidden="true">
          <ChevronLeft />
        </span>
      )}
      {range.map((p, i) =>
        p === "…" ? (
          <span key={`gap-${i}`} className="px-1 text-muted-foreground" aria-hidden="true">
            …
          </span>
        ) : (
          <Link
            key={p}
            href={hrefFor(p)}
            className={cn(item(p === page), Math.abs(p - page) > 1 && p !== 1 && p !== totalPages && "hidden sm:inline-flex")}
            aria-current={p === page ? "page" : undefined}
            aria-label={`Page ${p}`}
          >
            {p}
          </Link>
        ),
      )}
      {page < totalPages ? (
        <Link href={hrefFor(page + 1)} className={item()} aria-label="Next page" rel="next">
          <ChevronRight />
        </Link>
      ) : (
        <span className={cn(item(), "pointer-events-none opacity-40")} aria-hidden="true">
          <ChevronRight />
        </span>
      )}
    </nav>
  );
}
