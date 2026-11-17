import Form from "next/form";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const ADMIN_PAGE_SIZE = 20;

export function parseListParams(sp: Record<string, string | string[] | undefined>) {
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  return {
    q: first(sp.q).trim().slice(0, 80),
    page: Math.max(1, Number.parseInt(first(sp.page), 10) || 1),
    filter: first(sp.filter).trim().slice(0, 30),
  };
}

export function listHref(base: string, params: { q?: string; filter?: string; page?: number }) {
  const s = new URLSearchParams();
  if (params.q) s.set("q", params.q);
  if (params.filter) s.set("filter", params.filter);
  if (params.page && params.page > 1) s.set("page", String(params.page));
  const qs = s.toString();
  return qs ? `${base}?${qs}` : base;
}

export function AdminSearch({ action, q, placeholder, children }: { action: string; q: string; placeholder: string; children?: React.ReactNode }) {
  return (
    <Form action={action} role="search" className="mb-5 flex flex-wrap gap-2">
      <label className="relative min-w-52 flex-1">
        <span className="sr-only">{placeholder}</span>
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input name="q" type="search" defaultValue={q} placeholder={placeholder} className="h-10 pl-9" />
      </label>
      {children}
      <Button type="submit" variant="outline" className="h-10">
        Search
      </Button>
    </Form>
  );
}
