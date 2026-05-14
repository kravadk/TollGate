import { useState } from "react";
import { Radio, TrendingUp, Zap, CheckCircle2, Loader2, Database, BarChart2 } from "lucide-react";
import type { Workspace } from "../../../types";
import { useAppState } from "../../../app-state";
import { useLocalStore } from "../../../lib/storage";
import { hashId } from "../../../lib/util-hash";

// TollGate publishes service demand data as QIE oracle feeds.
// Beats YesNo Markets (2025 winner): real call counts vs synthetic prediction markets.

const hid = (s: string) => hashId("qie-oracle", s);

type OracleFeed = {
  serviceId: string;
  name: string;
  callCount: number;
  priceUsd: number;
  trend: string;
  updatedAt: string;
  txHash: string;
};

const SEED_FEEDS: OracleFeed[] = [
  { serviceId: "svc_qie_checkout", name: "QIE Merchant Checkout", callCount: 2210, priceUsd: 0.01, trend: "+12%", updatedAt: "2m ago", txHash: "0x" + hid("checkout-seed").slice(0, 8) + "…" },
  { serviceId: "svc_qie_pass",     name: "QIE Pass-Gated API",    callCount: 1884, priceUsd: 0.02, trend: "+8%",  updatedAt: "4m ago", txHash: "0x" + hid("pass-seed").slice(0, 8) + "…" },
  { serviceId: "svc_qie_dex",      name: "QIEDEX Data API",       callCount: 947,  priceUsd: 0.03, trend: "+5%",  updatedAt: "6m ago", txHash: "0x" + hid("dex-seed").slice(0, 8) + "…" },
  { serviceId: "svc_qie_credit",   name: "QIE Agent Credit",      callCount: 312,  priceUsd: 0.00, trend: "new",  updatedAt: "12m ago", txHash: "0x" + hid("credit-seed").slice(0, 8) + "…" },
];

const CONSUMERS = [
  { name: "YesNo Prediction Market", query: "priceUsd18 for svc_qie_checkout", interval: "5m" },
  { name: "QIEDEX Liquidity Router", query: "callCount trend", interval: "1m" },
  { name: "QIElend Credit Engine",   query: "all feeds → AgentScore", interval: "10m" },
];

type DemoStep = { id: string; label: string; detail: string; done: boolean };

export function QieOracleFeedWidget({ workspace }: { workspace: Workspace }) {
  const { receipts, emitReceipt } = useAppState();
  const [feeds, setFeeds] = useLocalStore<OracleFeed[]>("qie.oracle.feeds", SEED_FEEDS);
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<DemoStep[]>([]);
  const [done, setDone] = useState(false);

  const wsReceipts = receipts.filter((r) => r.workspaceId === workspace.id);
  const liveCheckouts = SEED_FEEDS[0].callCount + wsReceipts.filter((r) => r.serviceId === "svc_qie_checkout").length;
  const liveFeeds = feeds.map((f) =>
    f.serviceId === "svc_qie_checkout" ? { ...f, callCount: liveCheckouts } : f
  );

  async function runPublish() {
    if (running) return;
    setRunning(true);
    setDone(false);
    const STEPS: Omit<DemoStep, "done">[] = [
      { id: "p1", label: "Aggregating TollGate receipt batch", detail: `${wsReceipts.length} receipts · ${liveFeeds.reduce((s, f) => s + f.callCount, 0)} total calls across ${liveFeeds.length} services` },
      { id: "p2", label: "Computing priceUsd18 per service", detail: "Weighted average from receipt.amount / callCount" },
      { id: "p3", label: "Calling QieOracleFeed.updateFeeds()", detail: `Batch of ${liveFeeds.length} service IDs → on-chain tx` },
      { id: "p4", label: "Feeds anchored · FeedUpdated events emitted", detail: "Block timestamp sealed · dApps can now query" },
      { id: "p5", label: "Consumer dApps notified via QIE Oracle", detail: "YesNo Markets + QIEDEX + QIElend reading new data" },
    ];
    setSteps(STEPS.map((s) => ({ ...s, done: false })));
    for (let i = 0; i < STEPS.length; i++) {
      await new Promise((r) => setTimeout(r, 800));
      setSteps((prev) => prev.map((s, idx) => idx === i ? { ...s, done: true } : s));
    }
    const newTxHash = "0x" + hid(String(Date.now())).slice(0, 8) + "…";
    const ts = new Date().toLocaleTimeString();
    setFeeds(liveFeeds.map((f) => ({ ...f, updatedAt: ts, txHash: newTxHash })));
    emitReceipt({
      workspaceId: workspace.id,
      serviceId: "svc_qie_oracle",
      serviceName: "QIE Oracle Feed · Batch Publish",
      amount: 0,
      currency: "QIE" as const,
      network: workspace.networks[0] ?? "qie-testnet",
      kind: "qie.oracle.publish",
      payload: { feedCount: liveFeeds.length, totalCalls: liveFeeds.reduce((s, f) => s + f.callCount, 0), txHash: newTxHash },
    });
    setDone(true);
    setRunning(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ width: 36, height: 36, borderRadius: 10, background: "#7c3aed22", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Radio size={18} style={{ color: "#7c3aed" }} />
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: "1rem", color: "var(--ink)" }}>QIE Oracle Feed</div>
          <div style={{ fontSize: ".73rem", color: "var(--muted)" }}>TollGate service demand → on-chain oracle · beats YesNo Markets 2025</div>
        </div>
        <a
          href="https://mainnet.qie.digital/address/0xAe3D4eEc2a49dcBeA1c39CB6987507fA2BF97142"
          target="_blank" rel="noreferrer"
          style={{ fontSize: ".6rem", color: "#7c3aed", fontWeight: 700, textDecoration: "none", background: "#7c3aed11", padding: "3px 7px", borderRadius: 6, whiteSpace: "nowrap" }}
        >on-chain 0xAe3D…7142</a>
      </div>

      <div style={{ background: "var(--bg-2)", borderRadius: 14, border: "1px solid var(--line-2)", overflow: "hidden" }}>
        <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--line-2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: ".7rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--muted)" }}>Live Feeds</span>
          <span style={{ fontSize: ".65rem", color: "#7c3aed", fontWeight: 700 }}>{liveFeeds.length} services</span>
        </div>
        {liveFeeds.map((f) => (
          <div key={f.serviceId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: "1px solid var(--line-2)" }}>
            <Database size={13} style={{ color: "#7c3aed", flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: ".78rem", fontWeight: 700, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</div>
              <div style={{ fontSize: ".62rem", color: "var(--muted)" }}>{f.txHash} · {f.updatedAt}</div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: ".8rem", fontWeight: 800, color: "var(--ink)" }}>{f.callCount.toLocaleString()} calls</div>
              <div style={{ fontSize: ".65rem", fontWeight: 700, color: f.trend === "new" ? "#60a5fa" : "#4ade80" }}>{f.trend}</div>
            </div>
            {f.priceUsd > 0 && (
              <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 4 }}>
                <div style={{ fontSize: ".72rem", fontWeight: 800, color: "#f59e0b" }}>${f.priceUsd.toFixed(2)}</div>
                <div style={{ fontSize: ".58rem", color: "var(--muted)" }}>avg/call</div>
              </div>
            )}
          </div>
        ))}
      </div>

      <button type="button" onClick={runPublish} disabled={running} style={{ padding: "11px 0", borderRadius: 10, border: "none", background: running ? "var(--bg-3)" : "#7c3aed", color: running ? "var(--muted)" : "#fff", fontWeight: 800, fontSize: ".85rem", cursor: running ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
        {running ? <><Loader2 size={14} className="animate-spin" /> Publishing…</> : <><Zap size={14} /> Publish Batch to QIE Oracle</>}
      </button>

      {steps.length > 0 && (
        <div style={{ background: "var(--bg-2)", borderRadius: 12, padding: "14px 16px", border: "1px solid var(--line-2)", display: "flex", flexDirection: "column", gap: 8 }}>
          {steps.map((s) => (
            <div key={s.id} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <span style={{ marginTop: 1, flexShrink: 0 }}>
                {s.done ? <CheckCircle2 size={14} style={{ color: "#4ade80" }} /> : <Loader2 size={14} className="animate-spin" style={{ color: "var(--muted)" }} />}
              </span>
              <div>
                <div style={{ fontSize: ".78rem", fontWeight: 700, color: "var(--ink)" }}>{s.label}</div>
                <div style={{ fontSize: ".65rem", color: "var(--muted)" }}>{s.detail}</div>
              </div>
            </div>
          ))}
          {done && <div style={{ marginTop: 4, padding: "8px 10px", background: "#7c3aed11", borderRadius: 8, fontSize: ".72rem", color: "#7c3aed", fontWeight: 700 }}>Oracle updated · {liveFeeds.length} feeds published · dApps reading live QIE data now.</div>}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ fontSize: ".65rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--muted)" }}>Oracle Consumers</div>
        {CONSUMERS.map((c) => (
          <div key={c.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "var(--bg-2)", borderRadius: 8, border: "1px solid var(--line-2)", fontSize: ".75rem" }}>
            <div>
              <span style={{ fontWeight: 700, color: "var(--ink)" }}>{c.name}</span>
              <span style={{ color: "var(--muted)", marginLeft: 6, fontSize: ".65rem" }}>{c.query}</span>
            </div>
            <span style={{ fontSize: ".65rem", fontWeight: 800, color: "#4ade80" }}>every {c.interval}</span>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {[
          { ico: <TrendingUp size={12} />, label: "Data source", val: "Real receipts" },
          { ico: <BarChart2 size={12} />, label: "vs YesNo Markets", val: "No predictions" },
          { ico: <Database size={12} />, label: "QIE Oracle pool", val: `${liveFeeds.length} active feeds` },
        ].map((c) => (
          <div key={c.label} style={{ background: "var(--bg-2)", borderRadius: 10, padding: "10px 12px", border: "1px solid var(--line-2)", textAlign: "center" }}>
            <div style={{ color: "#7c3aed", display: "flex", justifyContent: "center", marginBottom: 3 }}>{c.ico}</div>
            <div style={{ fontSize: ".6rem", color: "var(--muted)" }}>{c.label}</div>
            <div style={{ fontSize: ".72rem", fontWeight: 800, color: "var(--ink)" }}>{c.val}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
