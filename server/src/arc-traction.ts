import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

const TRACTION_FILE = process.env.ARC_TRACTION_FILE ?? join(process.cwd(), "data", "arc-traction.jsonl");

export type ArcTractionEventType =
  | "page_open"
  | "wallet_connect"
  | "trace_unlock"
  | "portfolio_start"
  | "kill_switch_seen"
  | "feedback_submit";

export type ArcFeedbackPrompt = "clarity" | "trust" | "willingness" | "confusion";

export type ArcTractionEvent = {
  type: ArcTractionEventType;
  sessionId: string;
  wallet?: string;
  amountUsd?: number;
  feedbackPrompt?: ArcFeedbackPrompt;
  feedback?: string;
  ts: string;
};

export type ArcValidationHighlight = {
  prompt: ArcFeedbackPrompt;
  label: string;
  quote: string;
  ts: string;
};

export type ArcTractionStats = {
  testers: number;
  connectedWallets: number;
  traceUnlocks: number;
  protectedPortfolios: number;
  killSwitchViews: number;
  feedbackCount: number;
  decisionCount: number;
  testnetUsdcVolume: number;
  feedbackPrompts: Record<ArcFeedbackPrompt, number>;
  feedbackQuotes: string[];
  validationHighlights: ArcValidationHighlight[];
  recentEvents: ArcTractionEvent[];
};

function cleanSessionId(v: unknown): string {
  const raw = typeof v === "string" ? v : "";
  const clean = raw.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
  return clean || "anonymous";
}

function cleanWallet(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  return /^0x[0-9a-fA-F]{40}$/.test(v) ? v : undefined;
}

function cleanFeedback(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const clean = v.replace(/[^\x20-\x7E]/g, "").trim().slice(0, 240);
  return clean || undefined;
}

function cleanFeedbackPrompt(v: unknown): ArcFeedbackPrompt | undefined {
  const allowed: ArcFeedbackPrompt[] = ["clarity", "trust", "willingness", "confusion"];
  return typeof v === "string" && allowed.includes(v as ArcFeedbackPrompt) ? v as ArcFeedbackPrompt : undefined;
}

function feedbackPromptLabel(prompt: ArcFeedbackPrompt): string {
  if (prompt === "clarity") return "Clarity signal";
  if (prompt === "trust") return "Trust signal";
  if (prompt === "willingness") return "Willingness to copy";
  return "Confusion point";
}

export function makeArcTractionEvent(input: {
  type: unknown;
  sessionId: unknown;
  wallet?: unknown;
  amountUsd?: unknown;
  feedbackPrompt?: unknown;
  feedback?: unknown;
}): ArcTractionEvent | null {
  const allowed: ArcTractionEventType[] = ["page_open", "wallet_connect", "trace_unlock", "portfolio_start", "kill_switch_seen", "feedback_submit"];
  if (typeof input.type !== "string" || !allowed.includes(input.type as ArcTractionEventType)) return null;
  const amount = typeof input.amountUsd === "number" && Number.isFinite(input.amountUsd)
    ? Math.max(0, Math.min(1_000_000, input.amountUsd))
    : undefined;
  return {
    type: input.type as ArcTractionEventType,
    sessionId: cleanSessionId(input.sessionId),
    wallet: cleanWallet(input.wallet),
    amountUsd: amount,
    feedbackPrompt: cleanFeedbackPrompt(input.feedbackPrompt),
    feedback: cleanFeedback(input.feedback),
    ts: new Date().toISOString(),
  };
}

export function appendArcTractionEvent(event: ArcTractionEvent): void {
  mkdirSync(dirname(TRACTION_FILE), { recursive: true });
  appendFileSync(TRACTION_FILE, JSON.stringify(event) + "\n", "utf8");
}

export function readArcTractionEvents(): ArcTractionEvent[] {
  if (!existsSync(TRACTION_FILE)) return [];
  const lines = readFileSync(TRACTION_FILE, "utf8").split("\n").filter(Boolean).slice(-1000);
  const events: ArcTractionEvent[] = [];
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line) as ArcTractionEvent;
      if (parsed?.type && parsed?.sessionId && parsed?.ts) events.push(parsed);
    } catch {
      // Ignore malformed telemetry lines.
    }
  }
  return events;
}

export function buildArcTractionStats(events: ArcTractionEvent[], decisionCount: number): ArcTractionStats {
  const testers = new Set<string>();
  const wallets = new Set<string>();
  let traceUnlocks = 0;
  let protectedPortfolios = 0;
  let killSwitchViews = 0;
  let feedbackCount = 0;
  let volume = 0;
  const feedbackPrompts: Record<ArcFeedbackPrompt, number> = { clarity: 0, trust: 0, willingness: 0, confusion: 0 };
  const feedbackQuotes: string[] = [];
  const validationHighlights: ArcValidationHighlight[] = [];

  for (const event of events) {
    testers.add(event.sessionId);
    if (event.wallet) wallets.add(event.wallet.toLowerCase());
    if (event.type === "trace_unlock") traceUnlocks += 1;
    if (event.type === "portfolio_start") protectedPortfolios += 1;
    if (event.type === "kill_switch_seen") killSwitchViews += 1;
    if (event.type === "feedback_submit") {
      feedbackCount += 1;
      if (event.feedback && feedbackQuotes.length < 8) feedbackQuotes.push(event.feedback);
      if (event.feedbackPrompt) feedbackPrompts[event.feedbackPrompt] += 1;
      if (event.feedbackPrompt && event.feedback) {
        validationHighlights.unshift({
          prompt: event.feedbackPrompt,
          label: feedbackPromptLabel(event.feedbackPrompt),
          quote: event.feedback,
          ts: event.ts,
        });
      }
    }
    if (event.amountUsd) volume += event.amountUsd;
  }

  return {
    testers: testers.size,
    connectedWallets: wallets.size,
    traceUnlocks,
    protectedPortfolios,
    killSwitchViews,
    feedbackCount,
    decisionCount,
    testnetUsdcVolume: Math.round(volume * 100) / 100,
    feedbackPrompts,
    feedbackQuotes,
    validationHighlights: validationHighlights.slice(0, 8),
    recentEvents: events.slice(-20).reverse(),
  };
}
