import { type CSSProperties, useState } from "react";
import { AlertTriangle, CheckCircle, ExternalLink, ShieldCheck, Zap } from "lucide-react";
import { useLocalStore } from "../../lib/storage";
import { ActionPanel } from "./ActionPanel";

const CONTRACTS = [
  { label: "Arbitrum Sepolia", addr: "0x9dD4Df1dE852c8308A2d3Aa6bD8e2257Dd786A09", url: "https://sepolia.arbiscan.io/address/0x9dD4Df1dE852c8308A2d3Aa6bD8e2257Dd786A09" },
];

type Policy = { dailyLimitUsd: number; maxPerTxUsd: number; paused: boolean };
type TxLog  = { id: string; amount: number; ts: string; ok: boolean; reason?: string };

const inp: CSSProperties  = { padding: "7px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".84rem", width: "100%" };
const lbl: CSSProperties  = { fontSize: ".65rem", textTransform: "uppercase" as const, letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 };
const col: CSSProperties  = { display: "flex", flexDirection: "column" as const, gap: 4 };

function usd(n: number)  { return `$${n.toFixed(2)}`; }
function short(id: string) { return id.slice(0, 8) + "…" + id.slice(-4); }
function okBox(ok: boolean): CSSProperties {
  return { display: "flex", alignItems: "center", gap: 7, padding: "8px 12px", borderRadius: 10,
    background: ok ? "color-mix(in srgb, var(--green) 12%, transparent)" : "color-mix(in srgb, #f87171 12%, transparent)",
    color: ok ? "var(--green)" : "#f87171", fontSize: ".74rem", fontWeight: 700, flexWrap: "wrap" as const };
}

export function BudgetWidget({ agentId = "agent_0g_worker" }: { agentId?: string }) {
  const [policy, setPolicy] = useLocalStore<Policy>(`budget.policy.${agentId}`, { dailyLimitUsd: 1.0, maxPerTxUsd: 0.5, paused: false });
  const [log, setLog]       = useLocalStore<TxLog[]>(`budget.txLog.${agentId}`, []);
  const [testAmt, setTestAmt] = useState("0.10");
  const [dailyIn, setDailyIn] = useState(String(policy.dailyLimitUsd));
  const [maxIn,   setMaxIn]   = useState(String(policy.maxPerTxUsd));
  const [saved, setSaved] = useState(false);

  const cutoff     = Date.now() - 86_400_000;
  const spentToday = log.filter((t) => t.ok && new Date(t.ts).getTime() > cutoff).reduce((s, t) => s + t.amount, 0);
  const remaining  = Math.max(0, policy.dailyLimitUsd - spentToday);

  function savePolicy() {
    setPolicy({ ...policy, dailyLimitUsd: Math.max(0, parseFloat(dailyIn) || 0), maxPerTxUsd: Math.max(0, parseFloat(maxIn) || 0) });
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  function testPayment() {
    const amount = parseFloat(testAmt) || 0;
    const id = "sim_" + Math.random().toString(36).slice(2, 10);
    let ok = true; let reason: string | undefined;
    if (policy.paused) { ok = false; reason = "agent_paused"; }
    else if (policy.maxPerTxUsd > 0 && amount > policy.maxPerTxUsd) { ok = false; reason = `exceeds_max_per_tx (${usd(amount)} > ${usd(policy.maxPerTxUsd)})`; }
    else if (policy.dailyLimitUsd > 0 && amount > remaining)         { ok = false; reason = `exceeds_daily_limit (remaining ${usd(remaining)})`; }
    setLog((prev) => [{ id, amount, ts: new Date().toISOString(), ok, reason }, ...prev].slice(0, 20));
  }

  return (
    <ActionPanel
      icon={<ShieldCheck size={15} />}
      title="AgentBudget — Spending Policy Enforcer"
      sub={<>Per-agent daily limits · per-tx caps · emergency pause — inspired by <strong>EqualFi Agent Wallet Core</strong> ($25K)</>}
    >
      {/* Contract links */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
        {CONTRACTS.map((c) => (
          <a key={c.label} href={c.url} target="_blank" rel="noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: ".65rem", fontWeight: 700,
              padding: "3px 8px", borderRadius: 999, background: "var(--bg-2)", border: "1px solid var(--line-2)",
              color: "var(--muted)", textDecoration: "none" }}>
            <ExternalLink size={10} /> {c.label} · {c.addr.slice(0, 8)}…
          </a>
        ))}
      </div>

      {/* Gauge row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 8 }}>
        {[
          { label: "Spent today", val: usd(spentToday), warn: spentToday > policy.dailyLimitUsd * 0.9 },
          { label: "Remaining",   val: usd(remaining),  warn: false },
          { label: "Daily limit", val: usd(policy.dailyLimitUsd), warn: false },
        ].map((g) => (
          <div key={g.label} style={{ background: "var(--bg-2)", borderRadius: 10, padding: "10px 12px" }}>
            <div style={lbl}>{g.label}</div>
            <div style={{ fontSize: ".98rem", fontWeight: 700, color: g.warn ? "#f87171" : "var(--ink)", marginTop: 2 }}>{g.val}</div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      {policy.dailyLimitUsd > 0 && (
        <div style={{ height: 5, borderRadius: 999, background: "var(--bg-2)", overflow: "hidden", marginBottom: 16 }}>
          <div style={{ height: "100%", borderRadius: 999, transition: "width .4s",
            width: `${Math.min(100, (spentToday / policy.dailyLimitUsd) * 100)}%`,
            background: spentToday / policy.dailyLimitUsd > 0.9 ? "#f87171" : "var(--green)" }} />
        </div>
      )}

      {/* Policy controls */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <div style={col}><span style={lbl}>Daily limit (USD)</span><input style={inp} value={dailyIn} onChange={(e) => setDailyIn(e.target.value)} /></div>
        <div style={col}><span style={lbl}>Max per tx (USD)</span><input style={inp} value={maxIn}   onChange={(e) => setMaxIn(e.target.value)}   /></div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <button className="btn sm" onClick={savePolicy} style={{ flex: "1 1 auto" }}>
          {saved ? "✓ Policy saved" : "Set Policy (simulation)"}
        </button>
        <button className="btn sm" onClick={() => setPolicy({ ...policy, paused: !policy.paused })}
          style={{ background: policy.paused ? "color-mix(in srgb, var(--green) 12%, transparent)" : "color-mix(in srgb, #f87171 12%, transparent)", flex: "0 0 auto" }}>
          {policy.paused ? "▶ Unpause" : "⏸ Emergency Pause"}
        </button>
      </div>

      {/* Test payment block */}
      <div style={{ borderTop: "1px solid var(--line-2)", paddingTop: 14, marginBottom: 14 }}>
        <div style={{ ...lbl, marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
          <Zap size={11} /> Simulate a payment — watch it pass or get blocked
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ position: "relative", flex: 1 }}>
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", fontSize: ".82rem" }}>$</span>
            <input style={{ ...inp, paddingLeft: 22 }} value={testAmt} onChange={(e) => setTestAmt(e.target.value)} placeholder="0.10" />
          </div>
          <button className="btn sm" onClick={testPayment}>Simulate</button>
        </div>
      </div>

      {/* Result log */}
      {log.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {log.slice(0, 5).map((t) => (
            <div key={t.id} style={okBox(t.ok)}>
              {t.ok ? <CheckCircle size={13} /> : <AlertTriangle size={13} />}
              <span style={{ fontFamily: "monospace" }}>{short(t.id)}</span>
              <span>{usd(t.amount)}</span>
              {t.ok ? <span>→ approved</span> : <span>→ blocked: {t.reason}</span>}
            </div>
          ))}
        </div>
      )}

      <p style={{ margin: "14px 0 0", fontSize: ".73rem", color: "var(--muted)", lineHeight: 1.55 }}>
        On-chain: <code>AgentBudget.checkAndSpend(agentId, amountWei)</code> is called by the gateway before every
        payment — if it reverts, the payment is blocked. Deploys: see contract links above.
      </p>
    </ActionPanel>
  );
}
