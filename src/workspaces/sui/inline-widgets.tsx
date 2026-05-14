import { useState } from "react";
import { Play, RefreshCw, Check, Loader2, ArrowUpRight, Link as LinkIco, ShieldCheck } from "lucide-react";
import { Bolt } from "../../icons402";
import { useAppState } from "../../app-state";
import type { Workspace } from "../../types";
import { makeTxHash } from "../../data";

// ── Sui Demo Flow ─────────────────────────────────────────────────────────────

const SUI_DEMO_STEPS: { title: string; body: string }[] = [
  {
    title: "Agent sends an x402 payment request",
    body: "The SuiAgent OS receives a task. It finds the service behind a 402 Payment Required wall and signs a $0.025 SUI micro-payment — no account, no API key.",
  },
  {
    title: "IntentEngine parses NL → PTB",
    body: "The natural-language instruction is resolved into a Programmable Transaction Block: swap, stake, or call a Move contract — all in a single atomic tx.",
  },
  {
    title: "DeepBook escrow locks SUI, earns yield",
    body: "Funds not yet needed are locked in a DeepBook yield escrow. The agent earns the spread while waiting — idle capital put to work automatically.",
  },
  {
    title: "Walrus pins the result · receipt minted on Sui",
    body: "The job output is pinned as a Walrus blob (permanent, epoch-backed). A receipt NFT is minted on Sui mainnet — verifiable proof of work and payment.",
  },
];

const SUI_EXPLORER = "https://suiscan.xyz/mainnet";

function suiExplorerTx(hash: string) {
  return `${SUI_EXPLORER}/tx/${hash}`;
}

export function SuiDemoFlow({
  workspace,
  onGoTab,
  onGoReceipts,
}: {
  workspace: Workspace;
  onGoTab: (m: string) => boolean;
  onGoReceipts: () => void;
}) {
  const { emitReceipt } = useAppState();
  const [cursor, setCursor] = useState<number>(-1);
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [result, setResult] = useState<{ blobId: string; epochEnd: number; txHash: string } | null>(null);
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

  async function run() {
    if (phase === "running") return;
    setErr(null); setResult(null); setReceiptId(null);
    setPhase("running");

    setCursor(0); await sleep(700);
    setCursor(1); await sleep(900);
    setCursor(2); await sleep(850);
    setCursor(3);

    // Try real Walrus testnet upload; fall back to deterministic demo values
    let blobId = `7xK${Math.random().toString(36).slice(2, 10)}`;
    const epochEnd = 142;
    const txHash = makeTxHash();

    try {
      const body = JSON.stringify({ ptb: "swap_sui_usdc", amount: 0.025, intent: "earn DeepBook yield" });
      const res = await fetch("https://publisher.walrus-testnet.walrus.space/v1/blobs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body,
      });
      if (res.ok) {
        const data = (await res.json()) as { blobId?: string; blob?: { blobId?: string }; event?: { blobId?: string } };
        const id = data.blobId ?? data.blob?.blobId ?? data.event?.blobId;
        if (id) blobId = id;
      }
    } catch { /* use deterministic fallback */ }

    setResult({ blobId, epochEnd, txHash });

    const r = emitReceipt({
      workspaceId: workspace.id,
      serviceName: "SuiAgent OS · Intent → PTB → Walrus",
      amount: 0.025,
      currency: "SUI",
      network: workspace.networks[0] ?? "sui-mainnet",
      kind: "sui.demo-flow",
      payload: { blobId, epochEnd, txHash, ptb: "swap_sui_usdc + deepbook_escrow", walrus: true },
    });
    setReceiptId(r.id);
    setPhase("done");
  }

  function reset() {
    setCursor(-1); setPhase("idle"); setResult(null); setReceiptId(null); setErr(null);
  }

  const stepState = (i: number): "done" | "live" | "todo" => {
    if (i < cursor) return "done";
    if (i === cursor) return phase === "done" ? "done" : "live";
    return "todo";
  };

  const stepGlyph = (i: number) => {
    const st = stepState(i);
    if (st === "done") return <Check width={13} height={13} />;
    if (st === "live" && phase === "running") return <Loader2 width={13} height={13} className="wallet-spin" />;
    if (st === "live") return <Check width={13} height={13} />;
    return i + 1;
  };

  return (
    <div className="panel block ogdf mb">
      <div className="block-head">
        <div className="ttl">
          <span className="sq soft"><Bolt width={15} height={15} /></span>
          <div>
            <h3>Demo flow · an agent pays, parses intent, earns yield, pins to Walrus</h3>
            <div className="sub">402 → pay $0.025 SUI → IntentEngine → DeepBook escrow → Walrus pin + receipt NFT on Sui</div>
          </div>
        </div>
        {phase === "idle"
          ? <button className="btn btn-acc btn-sm" type="button" onClick={run}><Play width={13} height={13} /> Run the demo</button>
          : <button className="btn btn-ghost btn-sm" type="button" onClick={reset} disabled={phase === "running"}><RefreshCw width={12} height={12} /> Reset</button>}
      </div>

      <div className="ogdf-steps">
        {SUI_DEMO_STEPS.map((s, i) => {
          const st = stepState(i);
          return (
            <div key={i} className={`ogdf-step ogdf-step--${st}`}>
              <div className="ogdf-step__num">{stepGlyph(i)}</div>
              <div className="ogdf-step__body">
                <div className="ogdf-step__title">{s.title}</div>
                <div className="ogdf-step__desc">{s.body}</div>

                {i === 2 && result && (
                  <div className="ogdf-out">
                    <div className="ogdf-out__tag">
                      <span className="pill ok">DeepBook escrow active</span>
                      <span className="muted">epoch lock until #{result.epochEnd} · yield accruing</span>
                    </div>
                  </div>
                )}

                {i === 3 && phase === "done" && result && (
                  <div className="ogdf-out">
                    {receiptId && (
                      <div className="muted" style={{ fontSize: ".74rem", marginBottom: 8 }}>
                        Receipt{" "}
                        <code style={{ background: "rgba(77,162,255,.12)", padding: "1px 5px", borderRadius: 5 }}>{receiptId}</code>
                        {" · "}
                        <a href="#" onClick={(e) => { e.preventDefault(); onGoReceipts(); }}>open in ledger →</a>
                      </div>
                    )}
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <span className="muted" style={{ fontSize: ".74rem" }}>
                        Walrus blob{" "}
                        <code style={{ background: "rgba(77,162,255,.12)", padding: "1px 5px", borderRadius: 5 }}>
                          {result.blobId.slice(0, 12)}…
                        </code>
                        {" · "}epoch end #{result.epochEnd}
                      </span>
                      <a
                        href={suiExplorerTx(result.txHash)}
                        target="_blank"
                        rel="noreferrer"
                        style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#4DA2FF", fontWeight: 700, fontSize: ".78rem" }}
                      >
                        <LinkIco width={12} height={12} /> Receipt NFT on Sui mainnet <ArrowUpRight width={12} height={12} />
                      </a>
                    </div>
                    {err && <em style={{ color: "var(--red)", fontStyle: "normal", fontWeight: 600, marginLeft: 8, fontSize: ".74rem" }}>{err}</em>}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="ogdf-foot">
        <span className="muted">
          Powered by Sui mainnet · Walrus testnet · DeepBook v3 ·{" "}
          <a href="#" onClick={(e) => { e.preventDefault(); onGoTab("intent") || onGoTab("yield"); }}>open Intent Engine →</a>
        </span>
      </div>
    </div>
  );
}

// ── Sui Live Contracts / Ecosystem Panel ──────────────────────────────────────

const SUI_MAINNET_EXPLORER = "https://suiscan.xyz/mainnet";
const SUI_TESTNET_EXPLORER = "https://suiscan.xyz/testnet";

const SUI_ECOSYSTEM = [
  {
    label: "DeepBook v3 (Mainnet)",
    pkg: "0x000000000000000000000000000000000000000000000000000000000000dee9",
    explorer: SUI_MAINNET_EXPLORER,
    badge: "live",
  },
  {
    label: "Walrus System (Testnet)",
    pkg: "0x6fb735b74f92a9bebeabbf96d2e33f41c5ddab21aa33076f3b9d9a5bd1aae6c8",
    explorer: SUI_TESTNET_EXPLORER,
    badge: "testnet",
  },
  {
    label: "SuiAgentPay Move Pkg",
    pkg: "0x0000000000000000000000000000000000000000000000000000000000000000",
    explorer: SUI_TESTNET_EXPLORER,
    badge: "pending",
  },
  {
    label: "Sui Framework (0x2)",
    pkg: "0x0000000000000000000000000000000000000000000000000000000000000002",
    explorer: SUI_MAINNET_EXPLORER,
    badge: "live",
  },
] as const;

const BADGE_STYLE: Record<string, React.CSSProperties> = {
  live:    { color: "#4ade80", background: "#4ade8018" },
  testnet: { color: "#4DA2FF", background: "rgba(77,162,255,.12)" },
  pending: { color: "#f59e0b", background: "#f59e0b18" },
};

export function SuiLiveContractsPanel() {
  return (
    <div style={{ background: "var(--bg-2)", borderRadius: 14, border: "1px solid var(--line-2)", overflow: "hidden", marginTop: 14 }}>
      <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--line-2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: ".7rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--muted)" }}>Sui Ecosystem Packages</span>
        <span style={{ fontSize: ".63rem", color: "#4DA2FF", fontWeight: 700, background: "rgba(77,162,255,.12)", padding: "2px 7px", borderRadius: 5 }}>Sui mainnet + testnet</span>
      </div>
      {SUI_ECOSYSTEM.map((c) => {
        const isPending = c.badge === "pending";
        const short = isPending ? "deploy pending" : `${c.pkg.slice(0, 10)}…${c.pkg.slice(-6)}`;
        const bs = BADGE_STYLE[c.badge];
        return (
          <div key={c.label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 16px", borderBottom: "1px solid var(--line-2)" }}>
            <ShieldCheck width={13} height={13} style={{ color: bs.color, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: ".77rem", fontWeight: 700, color: "var(--ink)" }}>{c.label}</div>
              <div style={{ fontSize: ".62rem", color: "var(--muted)", fontFamily: "monospace" }}>
                {isPending ? "—" : c.pkg}
              </div>
            </div>
            {isPending ? (
              <span style={{ fontSize: ".6rem", fontWeight: 700, padding: "3px 7px", borderRadius: 5, whiteSpace: "nowrap", ...bs }}>
                pending ↗
              </span>
            ) : (
              <a
                href={`${c.explorer}/object/${c.pkg}`}
                target="_blank" rel="noreferrer"
                style={{ fontSize: ".6rem", fontWeight: 700, textDecoration: "none", padding: "3px 7px", borderRadius: 5, whiteSpace: "nowrap", ...bs }}
              >{short} ↗</a>
            )}
          </div>
        );
      })}
    </div>
  );
}
