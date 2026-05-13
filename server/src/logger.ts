// Minimal structured logger. Outputs newline-delimited JSON so logs are
// trivially parseable by Render, Datadog, Logtail, etc. Falls back to
// pretty-printed lines in DEV.

import { randomUUID } from "node:crypto";

type Level = "debug" | "info" | "warn" | "error";

interface LogEntry {
  ts:    string;
  level: Level;
  msg:   string;
  rid?:  string;
  [k: string]: unknown;
}

const DEV = process.env.NODE_ENV !== "production";

function emit(entry: LogEntry) {
  if (DEV) {
    const tag = entry.level.toUpperCase().padEnd(5);
    const ctx = Object.entries(entry)
      .filter(([k]) => !["ts", "level", "msg"].includes(k))
      .map(([k, v]) => `${k}=${typeof v === "string" ? v : JSON.stringify(v)}`)
      .join(" ");
    // eslint-disable-next-line no-console
    console.log(`[${entry.ts}] ${tag} ${entry.msg}${ctx ? "  " + ctx : ""}`);
  } else {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(entry));
  }
}

function make(level: Level) {
  return (msg: string, extra?: Record<string, unknown>) => {
    emit({ ts: new Date().toISOString(), level, msg, ...(extra ?? {}) });
  };
}

export const log = {
  debug: make("debug"),
  info:  make("info"),
  warn:  make("warn"),
  error: make("error"),
};

/** Generate a request id (short, URL-safe) for tracing through the stack. */
export function newRequestId(): string {
  return randomUUID().replace(/-/g, "").slice(0, 12);
}
