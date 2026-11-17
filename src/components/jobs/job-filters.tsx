"use client";

import { useState } from "react";
import Form from "next/form";
import Link from "next/link";
import { MapPin, Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  ARRANGEMENTS,
  ARRANGEMENT_LABELS,
  EMPLOYMENT_TYPES,
  EMPLOYMENT_TYPE_LABELS,
  EXPERIENCE_LEVELS,
  EXPERIENCE_LEVEL_LABELS,
  SALARY_FILTERS,
} from "@/lib/constants";
import type { JobFilters as Filters } from "@/lib/search";
import { cn } from "@/lib/utils";

export const FILTER_FORM_ID = "job-filters";

export function JobFilters({
  filters,
  categories,
  activeCount,
}: {
  filters: Filters;
  categories: { slug: string; name: string }[];
  activeCount: number;
}) {
  const [open, setOpen] = useState(false);
  const submit = (e: React.ChangeEvent<HTMLSelectElement>) => e.currentTarget.form?.requestSubmit();

  return (
    <Form id={FILTER_FORM_ID} action="/jobs" role="search" aria-label="Filter jobs" className="space-y-4">
      <div className="space-y-2.5">
        <div className="relative">
          <Label htmlFor="filter-q" className="sr-only">
            Keywords
          </Label>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input id="filter-q" name="q" type="search" defaultValue={filters.q} placeholder="Title, skill, or company" className="h-10 pl-9" />
        </div>
        <div className="relative">
          <Label htmlFor="filter-location" className="sr-only">
            Location
          </Label>
          <MapPin className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input id="filter-location" name="location" defaultValue={filters.location} placeholder="City or country" className="h-10 pl-9" />
        </div>
        <div className="flex gap-2">
          <Button type="submit" className="h-10 flex-1">
            Search
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-10 lg:hidden"
            aria-expanded={open}
            aria-controls="more-filters"
            onClick={() => setOpen((o) => !o)}
          >
            <SlidersHorizontal />
            Filters
            {activeCount > 0 && (
              <span className="rounded-full bg-primary px-1.5 text-xs text-primary-foreground tabular-nums">{activeCount}</span>
            )}
          </Button>
        </div>
      </div>

      <div id="more-filters" className={cn("space-y-4 lg:block", open ? "block" : "hidden")}>
        <FilterSelect id="filter-category" name="category" label="Category" defaultValue={filters.category} onChange={submit} any="All categories">
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect id="filter-arrangement" name="arrangement" label="Work arrangement" defaultValue={filters.arrangement} onChange={submit} any="Any arrangement">
          {ARRANGEMENTS.map((a) => (
            <option key={a} value={a}>
              {ARRANGEMENT_LABELS[a]}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect id="filter-type" name="type" label="Employment type" defaultValue={filters.type} onChange={submit} any="Any type">
          {EMPLOYMENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {EMPLOYMENT_TYPE_LABELS[t]}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect id="filter-level" name="level" label="Experience level" defaultValue={filters.level} onChange={submit} any="Any level">
          {EXPERIENCE_LEVELS.map((l) => (
            <option key={l} value={l}>
              {EXPERIENCE_LEVEL_LABELS[l]}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect
          id="filter-salary"
          name="salaryMin"
          label="Minimum salary"
          defaultValue={filters.salaryMin ? String(filters.salaryMin) : ""}
          onChange={submit}
          any="Any salary"
        >
          {SALARY_FILTERS.map((s) => (
            <option key={s} value={s}>
              ${s / 1000}k+ per year
            </option>
          ))}
        </FilterSelect>
        {activeCount > 0 && (
          <Button asChild variant="ghost" className="w-full">
            <Link href="/jobs">Clear all filters</Link>
          </Button>
        )}
      </div>
    </Form>
  );
}

function FilterSelect({
  id,
  label,
  any,
  children,
  ...props
}: React.ComponentProps<"select"> & { id: string; label: string; any: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </Label>
      <NativeSelect id={id} {...props}>
        <option value="">{any}</option>
        {children}
      </NativeSelect>
    </div>
  );
}

/** Lives outside the form in the results header; associated through the `form` attribute. */
export function SortSelect({ value, options }: { value: string; options: { value: string; label: string }[] }) {
  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="sort" className="shrink-0 text-sm text-muted-foreground">
        Sort by
      </Label>
      <NativeSelect
        id="sort"
        name="sort"
        form={FILTER_FORM_ID}
        defaultValue={value}
        className="h-9 w-44"
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </NativeSelect>
    </div>
  );
}
