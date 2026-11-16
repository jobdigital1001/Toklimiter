"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { saveClientSettings, useClientSettings } from "@/lib/client-settings";
import { anthropicKeySchema } from "@/lib/validation";

export function SettingsForm() {
  const settings = useClientSettings();
  const [draftKey, setDraftKey] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const key = draftKey ?? settings.anthropicKey;
  const hasSavedKey = settings.anthropicKey !== "";

  function persist(next: { accurate: boolean; anthropicKey: string }, text: string) {
    const ok = saveClientSettings(next);
    setMessage(
      ok ? { tone: "ok", text } : { tone: "error", text: "This browser is blocking local storage, so settings cannot be saved." },
    );
    if (ok) setDraftKey(null);
  }

  function saveKey() {
    const parsed = anthropicKeySchema.safeParse(key.trim());
    if (!parsed.success) {
      setMessage({ tone: "error", text: "That does not look like an Anthropic API key. Keys start with “sk-ant-”." });
      return;
    }
    persist({ accurate: true, anthropicKey: parsed.data }, "API key saved in this browser. Accurate counting is on.");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Token counting</CardTitle>
        <CardDescription>
          By default tokens are estimated locally and nothing leaves ContextBudget. You can switch
          to exact counts from Anthropic&apos;s Token Count API using your own API key.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="anthropic-key">Anthropic API key</Label>
          <Input
            id="anthropic-key"
            type="password"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            placeholder="sk-ant-…"
            value={key}
            aria-describedby="anthropic-key-hint"
            onChange={(event) => setDraftKey(event.target.value)}
          />
          <p id="anthropic-key-hint" className="text-sm text-muted-foreground">
            Stored only in this browser. It is sent with an audit when accurate counting is on and
            is never saved on the server.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={saveKey} disabled={key.trim() === ""}>
              Save key
            </Button>
            <Button
              variant="outline"
              disabled={!hasSavedKey}
              onClick={() => persist({ accurate: false, anthropicKey: "" }, "API key removed. Using the local approximation.")}
            >
              Remove key
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor="accurate-switch">Accurate token counting</Label>
            <p id="accurate-hint" className="text-sm text-muted-foreground">
              When on, your prompt and the text of up to 40 scanned files are sent to Anthropic to
              be counted. Requires a saved key.
            </p>
          </div>
          <Switch
            id="accurate-switch"
            aria-describedby="accurate-hint"
            checked={settings.accurate && hasSavedKey}
            disabled={!hasSavedKey}
            onCheckedChange={(checked) =>
              persist(
                { accurate: checked, anthropicKey: settings.anthropicKey },
                checked ? "Accurate counting is on." : "Accurate counting is off. Using the local approximation.",
              )
            }
          />
        </div>

        <p
          role="status"
          aria-live="polite"
          className={message?.tone === "error" ? "text-sm text-destructive" : "text-sm text-success"}
        >
          {message?.text}
        </p>
      </CardContent>
    </Card>
  );
}
