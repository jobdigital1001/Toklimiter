import Form from "next/form";
import { MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { ARRANGEMENTS, ARRANGEMENT_LABELS, EMPLOYMENT_TYPES, EMPLOYMENT_TYPE_LABELS } from "@/lib/constants";

/** Hero search: a plain GET form to /jobs, so it works before hydration. */
export function SearchBar({ categories }: { categories: { slug: string; name: string }[] }) {
  const select = "h-11 border-transparent bg-muted/60 shadow-none dark:bg-input/40";
  return (
    <Form action="/jobs" className="rounded-2xl border bg-card p-3 shadow-xl shadow-primary/5 sm:p-4" role="search" aria-label="Search jobs">
      <div className="grid gap-2.5 md:grid-cols-[1.4fr_1fr_auto]">
        <label className="relative block">
          <span className="sr-only">Keywords</span>
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            name="q"
            type="search"
            placeholder="Job title, skill, or company"
            className="h-12 w-full rounded-xl border border-input bg-transparent pr-3 pl-10 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm"
          />
        </label>
        <label className="relative block">
          <span className="sr-only">Location</span>
          <MapPin className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            name="location"
            placeholder="City or country"
            className="h-12 w-full rounded-xl border border-input bg-transparent pr-3 pl-10 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm"
          />
        </label>
        <Button type="submit" size="lg" className="h-12 rounded-xl px-7 text-base md:text-sm">
          Search jobs
        </Button>
      </div>
      <div className="mt-2.5 grid gap-2.5 sm:grid-cols-3">
        <NativeSelect name="arrangement" aria-label="Work arrangement" defaultValue="" className={select}>
          <option value="">Any arrangement</option>
          {ARRANGEMENTS.map((a) => (
            <option key={a} value={a}>
              {ARRANGEMENT_LABELS[a]}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect name="type" aria-label="Employment type" defaultValue="" className={select}>
          <option value="">Any employment type</option>
          {EMPLOYMENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {EMPLOYMENT_TYPE_LABELS[t]}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect name="category" aria-label="Job category" defaultValue="" className={select}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </NativeSelect>
      </div>
    </Form>
  );
}
