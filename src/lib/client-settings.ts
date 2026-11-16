"use client";

import { useSyncExternalStore } from "react";

/**
 * Settings that live only in this browser (localStorage). The Anthropic API
 * key is never stored on the server; it is sent with an audit request only
 * when accurate counting is switched on.
 */
export interface ClientSettings {
  accurate: boolean;
  anthropicKey: string;
}

const STORAGE_KEY = "contextbudget.settings";
const DEFAULTS: ClientSettings = { accurate: false, anthropicKey: "" };
const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cached: ClientSettings = DEFAULTS;

function read(): ClientSettings {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // Storage unavailable (private mode, blocked): fall back to defaults.
  }
  if (raw === cachedRaw) return cached;
  cachedRaw = raw;
  try {
    const parsed = raw ? (JSON.parse(raw) as Partial<ClientSettings>) : {};
    cached = {
      accurate: parsed.accurate === true,
      anthropicKey: typeof parsed.anthropicKey === "string" ? parsed.anthropicKey : "",
    };
  } catch {
    cached = DEFAULTS;
  }
  return cached;
}

export function saveClientSettings(settings: ClientSettings): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    return false;
  }
  listeners.forEach((listener) => listener());
  return true;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export function useClientSettings(): ClientSettings {
  return useSyncExternalStore(subscribe, read, () => DEFAULTS);
}
