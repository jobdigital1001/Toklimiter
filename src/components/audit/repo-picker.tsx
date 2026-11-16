"use client";

import { useEffect, useMemo, useState } from "react";
import { Lock, RefreshCw } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface RepoOption {
  id: string;
  fullName: string;
  private: boolean;
  defaultBranch: string;
}

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; repos: RepoOption[] };

const VISIBLE_LIMIT = 50;

export function RepoPicker({
  selected,
  onSelect,
}: {
  selected: RepoOption | null;
  onSelect: (repo: RepoOption) => void;
}) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [query, setQuery] = useState("");

  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/repos", { signal: controller.signal })
      .then(async (response) => {
        const body = (await response.json()) as { repos?: RepoOption[]; error?: string };
        if (!response.ok || !body.repos) {
          setState({ status: "error", message: body.error ?? "Could not load repositories." });
        } else {
          setState({ status: "ready", repos: body.repos });
        }
      })
      .catch((error: Error) => {
        if (error.name === "AbortError") return;
        setState({
          status: "error",
          message: "Could not load repositories. Check your connection.",
        });
      });
    return () => controller.abort();
  }, [attempt]);

  const filtered = useMemo(() => {
    if (state.status !== "ready") return [];
    const q = query.trim().toLowerCase();
    return q ? state.repos.filter((repo) => repo.fullName.toLowerCase().includes(q)) : state.repos;
  }, [state, query]);

  if (state.status === "loading") {
    return (
      <div role="status" aria-live="polite" className="flex flex-col gap-2">
        <span className="sr-only">Loading your repositories…</span>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <Alert variant="destructive" role="alert" className="flex flex-col gap-3">
        <p>{state.message}</p>
        <Button
          variant="outline"
          className="self-start"
          onClick={() => {
            setState({ status: "loading" });
            setAttempt((n) => n + 1);
          }}
        >
          <RefreshCw aria-hidden="true" /> Try again
        </Button>
      </Alert>
    );
  }

  if (state.repos.length === 0) {
    return (
      <Alert>
        No repositories are available yet. Grant ContextBudget access to at least one repository in
        your GitHub settings, then reload this page.
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor="repo-search">Search repositories</Label>
        <Input
          id="repo-search"
          type="search"
          autoComplete="off"
          placeholder="owner/name"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {filtered.length === 0
          ? "No repositories match."
          : filtered.length > VISIBLE_LIMIT
            ? `Showing ${VISIBLE_LIMIT} of ${filtered.length}. Search to narrow the list.`
            : `${filtered.length} ${filtered.length === 1 ? "repository" : "repositories"}`}
      </p>
      <fieldset>
        <legend className="sr-only">Repository</legend>
        <ul className="flex flex-col gap-2">
          {filtered.slice(0, VISIBLE_LIMIT).map((repo) => {
            const checked = selected?.id === repo.id;
            return (
              <li key={repo.id}>
                <label
                  className={cn(
                    "flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 has-focus-visible:outline-2 has-focus-visible:outline-ring",
                    checked ? "border-primary bg-accent" : "hover:bg-muted",
                  )}
                >
                  <input
                    type="radio"
                    name="repository"
                    value={repo.fullName}
                    checked={checked}
                    onChange={() => onSelect(repo)}
                    className="size-5 accent-[var(--primary)]"
                  />
                  <span className="min-w-0 flex-1 break-all font-medium">{repo.fullName}</span>
                  {repo.private ? (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Lock className="size-3.5" aria-hidden="true" /> Private
                    </span>
                  ) : null}
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>
    </div>
  );
}
