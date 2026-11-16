"use client";

import { useState } from "react";
import { Check, Copy, Download } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RULE_LABELS, type Finding } from "@/lib/analysis/types";
import type { AuditView } from "@/lib/audit-store";
import { cn, formatTokens } from "@/lib/utils";

const SEVERITY_LABEL = { high: "High", medium: "Medium", low: "Low" } as const;
const VISIBLE_FINDINGS = 8;
const VISIBLE_EXCLUDED = 10;

function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "good" | "bad" }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "mt-1 text-2xl font-bold tabular-nums",
          tone === "good" && "text-success",
          tone === "bad" && "text-destructive",
        )}
      >
        {value}
      </dd>
      {hint ? <dd className="text-sm text-muted-foreground">{hint}</dd> : null}
    </div>
  );
}

function FindingItem({ finding }: { finding: Finding }) {
  return (
    <li className="flex flex-col gap-1.5 rounded-lg border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={finding.severity}>{SEVERITY_LABEL[finding.severity]}</Badge>
        <span className="font-semibold">{RULE_LABELS[finding.ruleId]}</span>
        {finding.estimatedTokensSaved > 0 ? (
          <span className="ml-auto text-sm tabular-nums text-muted-foreground">
            saves ~{formatTokens(finding.estimatedTokensSaved)}
          </span>
        ) : null}
      </div>
      {finding.filePath ? <code className="break-all text-sm">{finding.filePath}</code> : null}
      <p className="text-sm">{finding.explanation}</p>
      <p className="text-sm text-muted-foreground">{finding.suggestedAction}</p>
    </li>
  );
}

export function AuditReport({ audit, warnings = [] }: { audit: AuditView; warnings?: string[] }) {
  const [copied, setCopied] = useState<"idle" | "copied" | "failed">("idle");
  const { pack } = audit;
  const saved = Math.max(0, audit.estimatedTokens - audit.recommendedTokens);
  const savedPercent = audit.estimatedTokens > 0 ? Math.round((saved / audit.estimatedTokens) * 100) : 0;
  const withinBudget = audit.recommendedTokens <= audit.tokenBudget;

  const contributors = [
    ...pack.selectedFiles.map((file) => ({ ...file, kept: true })),
    ...pack.excludedFiles.map((file) => ({ ...file, kept: false })),
  ]
    .sort((a, b) => b.tokens - a.tokens)
    .slice(0, 8);
  const largest = contributors[0]?.tokens ?? 0;

  async function copyPack() {
    try {
      await navigator.clipboard.writeText(pack.markdown);
      setCopied("copied");
    } catch {
      setCopied("failed");
    }
    window.setTimeout(() => setCopied("idle"), 2500);
  }

  function downloadPack() {
    const url = URL.createObjectURL(new Blob([pack.markdown], { type: "text/markdown;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `context-pack-${audit.repository.replace(/[^A-Za-z0-9._-]+/g, "-")}.md`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="break-all text-sm text-muted-foreground">{audit.repository}</p>
        <p className="font-medium">{audit.task}</p>
      </div>

      {warnings.map((warning) => (
        <Alert key={warning} variant="warning">
          {warning}
        </Alert>
      ))}

      <section aria-labelledby="summary-heading">
        <h2 id="summary-heading" className="sr-only">
          Token estimate
        </h2>
        <dl className="grid grid-cols-2 gap-3">
          <Stat label="Estimated total" value={formatTokens(audit.estimatedTokens)} hint="prompt + all matched files" />
          <Stat
            label="Context pack"
            value={formatTokens(audit.recommendedTokens)}
            hint={withinBudget ? `within ${formatTokens(audit.tokenBudget)} budget` : `over ${formatTokens(audit.tokenBudget)} budget`}
            tone={withinBudget ? "good" : "bad"}
          />
          <Stat label="Tokens saved" value={formatTokens(saved)} hint={`${savedPercent}% less context`} />
          <Stat label="Findings" value={String(audit.findings.length)} hint="waste and quality issues" />
        </dl>
      </section>

      <Card>
        <CardHeader>
          <CardTitle id="pack-heading">Context pack</CardTitle>
          <CardDescription>Paste this into Claude Code instead of your original prompt.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={copyPack}>
              {copied === "copied" ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
              {copied === "copied" ? "Copied" : "Copy pack"}
            </Button>
            <Button variant="outline" onClick={downloadPack}>
              <Download aria-hidden="true" /> Download .md
            </Button>
          </div>
          <p role="status" aria-live="polite" className="text-sm text-muted-foreground empty:hidden">
            {copied === "copied"
              ? "Context pack copied to the clipboard."
              : copied === "failed"
                ? "Copying was blocked by the browser. Select the text below and copy it manually."
                : ""}
          </p>
          <pre
            tabIndex={0}
            aria-labelledby="pack-heading"
            data-testid="pack-markdown"
            className="max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-muted p-3 font-mono text-sm"
          >
            {pack.markdown}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Waste findings</CardTitle>
          <CardDescription>
            {audit.findings.length === 0
              ? "Nothing to flag. This task is already lean."
              : "Most serious first."}
          </CardDescription>
        </CardHeader>
        {audit.findings.length > 0 ? (
          <CardContent className="flex flex-col gap-2">
            <ul className="flex flex-col gap-2">
              {audit.findings.slice(0, VISIBLE_FINDINGS).map((finding, index) => (
                <FindingItem key={index} finding={finding} />
              ))}
            </ul>
            {audit.findings.length > VISIBLE_FINDINGS ? (
              <details>
                <summary className="flex min-h-12 cursor-pointer items-center font-medium text-primary">
                  Show {audit.findings.length - VISIBLE_FINDINGS} more findings
                </summary>
                <ul className="mt-2 flex flex-col gap-2">
                  {audit.findings.slice(VISIBLE_FINDINGS).map((finding, index) => (
                    <FindingItem key={index} finding={finding} />
                  ))}
                </ul>
              </details>
            ) : null}
          </CardContent>
        ) : null}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Largest context contributors</CardTitle>
          <CardDescription>The files that would cost the most tokens.</CardDescription>
        </CardHeader>
        <CardContent>
          {contributors.length === 0 ? (
            <p className="text-sm text-muted-foreground">No files matched your patterns.</p>
          ) : (
            <ol className="flex flex-col gap-3">
              {contributors.map((file) => (
                <li key={file.path} className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <code className="min-w-0 break-all text-sm">{file.path}</code>
                    <span className="shrink-0 text-sm tabular-nums">{formatTokens(file.tokens)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                      <div
                        className={cn("h-full rounded-full", file.kept ? "bg-primary" : "bg-muted-foreground/50")}
                        style={{ width: `${largest > 0 ? Math.max(2, (file.tokens / largest) * 100) : 0}%` }}
                      />
                    </div>
                    <Badge variant={file.kept ? "success" : "low"}>{file.kept ? "In pack" : "Excluded"}</Badge>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recommended files to exclude</CardTitle>
          <CardDescription>
            {pack.excludedFiles.length === 0
              ? "No files need excluding."
              : `${formatTokens(pack.excludedFiles.length)} ${pack.excludedFiles.length === 1 ? "file" : "files"}, largest first.`}
          </CardDescription>
        </CardHeader>
        {pack.excludedFiles.length > 0 ? (
          <CardContent>
            <ExcludedList files={pack.excludedFiles.slice(0, VISIBLE_EXCLUDED)} />
            {pack.excludedFiles.length > VISIBLE_EXCLUDED ? (
              <details>
                <summary className="flex min-h-12 cursor-pointer items-center font-medium text-primary">
                  Show {formatTokens(pack.excludedFiles.length - VISIBLE_EXCLUDED)} more
                </summary>
                <ExcludedList files={pack.excludedFiles.slice(VISIBLE_EXCLUDED)} />
              </details>
            ) : null}
          </CardContent>
        ) : null}
      </Card>
    </div>
  );
}

function ExcludedList({ files }: { files: AuditView["pack"]["excludedFiles"] }) {
  return (
    <ul className="divide-y">
      {files.map((file) => (
        <li key={file.path} className="flex flex-col gap-0.5 py-2">
          <div className="flex items-baseline justify-between gap-3">
            <code className="min-w-0 break-all text-sm">{file.path}</code>
            <span className="shrink-0 text-sm tabular-nums">{formatTokens(file.tokens)}</span>
          </div>
          <span className="text-sm text-muted-foreground">{file.reason}</span>
        </li>
      ))}
    </ul>
  );
}
