import { useState } from "react";
import { Award, Zap, TrendingUp, CheckCircle2, Loader2 } from "lucide-react";
import type { Workspace } from "../../../types";
import { useAppState } from "../../../app-state";
import { useLocalStore } from "../../../lib/storage";
import { hashId } from "../../../lib/util-hash";

// AgentScore → QIElend credit line widget.
// Beats NeuroCred (2025 QIE winner): real x402 receipts as score basis, no off-chain ML.

const hid = (s: string) => hashId("qie-credit", s);

type Tier = "Bronze" | "Silver" | "Gold" | "Platinum";

const TIER_COLOR: Record<Tier, string> = {
  Bronze:   "#cd7f32",
  Silver:   "#a0aec0",
  Gold:     "#f59e0b",
  Platinum: "#60a5fa",
};
const TIER_LIMIT: Record<Tier, number> = { Bronze: 0, Silver: 10, Gold: 50, Platinum: 200 };

function scoreTier(s: number): Tier {
  if (s >= 850) return "Platinum";
  if (s >= 700) return "Gold";
  if (s >= 400) return "Silver";
  return "Bronze";
}

type DemoStep = { id: string; label: string; detail: string; done: boolean };
type BorrowRecord = { id: string; amount: number; service: string; ts: string; repaid: boolean };

export function QieCreditWidget({ workspace }: { workspace: Workspace }) {
  const { receipts, emitReceipt } = useAppState();
  const [borrowed, setBorrowed] = useLocalStore<number>("qie.credit.borrowed", 0);
  const [borrows, setBorrows] = useLocalStore<BorrowRecord[]>("qie.credit.borrows", []);
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<DemoStep[]>([]);
  const [done, setDone] = useState(false);
  const [repaying, setRepaying] = useState(false);

  const wsReceipts = receipts.filter((r) => r.workspaceId === workspace.id);
  const count = wsReceipts.length;
  const volume = wsReceipts.reduce((s, r) => s + (r.amount ?? 0), 0);
  const base = Math.min(count * 5, 500);
  const vol = Math.min(Math.floor(volume), 300);
  const score = Math.min(base + vol, 1000);
  const tier = scoreTier(score);
  const limitQie = TIER_LIMIT[tier];
  const availQie = Math.max(0, limitQie - borrowed);
  const col = TIER_COLOR[tier];

  async function runDemo() {
    if (running) return;
    setRunning(true);
    setDone(false);
    const STEPS: Omit<DemoStep, "done">[] = [
      { id: "s1", label: "Reading AgentScore from QIE receipts", detail: `${count} receipts · $${volume.toFixed(2)} volume → score ${score}` },
      { id: "s2", label: "Checking QieAgentCredit.sol tier", detail: `Tier: ${tier} · Credit limit: ${limitQie} QIE` },
      { id: "s3", label: "Borrowing 2 QIE from credit pool", detail: "QieAgentCredit.borrow(2 QIE) — simulated tx" },
      { id: "s4", label: "Paying svc_qie_checkout with borrowed QIE", detail: "x402 payment · TollGate gateway · receipt issued" },
      { id: "s5", label: "Receipt anchored on QIE chain", detail: "Signed receipt · AgentScore updated · credit line active" },
    ];
    setSteps(STEPS.map((s) => ({ ...s, done: false })));
    for (let i = 0; i < STEPS.length; i++) {
      await new Promise((r) => setTimeout(r, 900));
      setSteps((prev) => prev.map((s, idx) => idx === i ? { ...s, done: true } : s));
    }
    const nb: BorrowRecord = { id: "brw_" + hid(String(Date.now())), amount: 2, service: "svc_qie_checkout", ts: new Date().toLocaleTimeString(), repaid: false };
    setBorrows((prev) => [nb, ...prev.slice(0, 4)]);
    setBorrowed((b) => +(b + 2).toFixed(4));
    emitReceipt({ workspaceId: workspace.id, serviceId: "svc_qie_credit", serviceName: "QIE Agent Credit · Borrow", amount: 2, currency: "QIE" as const, network: workspace.networks[0] ?? "qie-testnet", kind: "qie.credit.borrow", payload: { score, tier, limitQie, borrowedQie: 2 } });
    setDone(true);
    setRunning(false);
  }

  async function repayAll() {
    if (repaying || borrowed === 0) return;
    setRepaying(true);
    await new Promise((r) => setTimeout(r, 800));
    emitReceipt({ workspaceId: workspace.id, serviceId: "svc_qie_credit", serviceName: "QIE Agent Credit · Repay", amount: borrowed, currency: "QIE" as const, network: workspace.networks[0] ?? "qie-testnet", kind: "qie.credit.repay", payload: { repaidQie: borrowed } });
    setBorrows((prev) => prev.map((b) => ({ ...b, repaid: true })));
    setBorrowed(0);
    setRepaying(false);
  }

  const r = 34, circ = 2 * Math.PI * r;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ width: 36, height: 36, borderRadius: 10, background: `${col}22`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Award size={18} style={{ color: col }} />
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: "1rem", color: "var(--ink)" }}>QIE Agent Credit Line</div>
          <div style={{ fontSize: ".73rem", color: "var(--muted)" }}>AgentScore from real receipts → QIElend · beats NeuroCred 2025</div>
        </div>
        <a
          href="https://testnet.qie.digital/address/0xBA4721Df33C3f32d8d35dEE21745cDC2B5b2Db81"
          target="_blank" rel="noreferrer"
          style={{ fontSize: ".6rem", color: col, fontWeight: 700, textDecoration: "none", background: `${col}18`, padding: "3px 7px", borderRadius: 6, whiteSpace: "nowrap" }}
        >on-chain 0xBA47…Db81</a>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ background: "var(--bg-2)", borderRadius: 14, padding: "18px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, border: "1px solid var(--line-2)" }}>
          <svg width="80" height="80" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r={r} fill="none" stroke="var(--line-2)" strokeWidth="6" />
            <circle cx="40" cy="40" r={r} fill="none" stroke={col} strokeWidth="6"
              strokeDasharray={`${circ * (score / 1000)} ${circ}`} strokeLinecap="round"
              transform="rotate(-90 40 40)" style={{ transition: "stroke-dasharray .5s ease" }} />
            <text x="40" y="45" textAnchor="middle" fill={col} fontSize="15" fontWeight="900">{score}</text>
          </svg>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: ".85rem", fontWeight: 800, color: col }}>{tier}</div>
            <div style={{ fontSize: ".62rem", color: "var(--muted)" }}>{count} receipts · ${volume.toFixed(2)}</div>
          </div>
        </div>

        <div style={{ background: "var(--bg-2)", borderRadius: 14, padding: "16px 14px", display: "flex", flexDirection: "column", gap: 12, border: "1px solid var(--line-2)" }}>
          {[
            { label: "Credit limit", val: `${limitQie} QIE`, col },
            { label: "Borrowed", val: `${borrowed.toFixed(2)} QIE`, col: borrowed > 0 ? "#f59e0b" : "var(--muted)" },
            { label: "Available", val: `${availQie.toFixed(2)} QIE`, col: availQie > 0 ? "#4ade80" : "var(--muted)" },
          ].map((row) => (
            <div key={row.label} style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: ".72rem", color: "var(--muted)" }}>{row.label}</span>
              <span style={{ fontSize: ".8rem", fontWeight: 800, color: row.col }}>{row.val}</span>
            </div>
          ))}
          {tier === "Bronze" && (
            <div style={{ fontSize: ".62rem", color: "#f59e0b", background: "#f59e0b11", borderRadius: 6, padding: "5px 8px" }}>
              Complete receipts to reach Silver (score 400) and unlock credit.
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button type="button" onClick={runDemo} disabled={running || tier === "Bronze"} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "none", background: running || tier === "Bronze" ? "var(--bg-3)" : col, color: running || tier === "Bronze" ? "var(--muted)" : "#0a0a0b", fontWeight: 800, fontSize: ".85rem", cursor: running || tier === "Bronze" ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          {running ? <><Loader2 size={14} className="animate-spin" /> Running…</> : <><Zap size={14} /> Borrow &amp; Pay Demo</>}
        </button>
        {borrowed > 0 && (
          <button type="button" onClick={repayAll} disabled={repaying} style={{ padding: "11px 16px", borderRadius: 10, border: "1px solid #4ade8055", background: "transparent", color: "#4ade80", fontWeight: 700, fontSize: ".8rem", cursor: repaying ? "default" : "pointer" }}>
            {repaying ? "Repaying…" : "Repay all"}
          </button>
        )}
      </div>

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
          {done && <div style={{ marginTop: 4, padding: "8px 10px", background: "#4ade8011", borderRadius: 8, fontSize: ".72rem", color: "#4ade80", fontWeight: 700 }}>Agent borrowed 2 QIE → paid service → receipt issued. Repay when revenue arrives.</div>}
        </div>
      )}

      {borrows.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: ".65rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--muted)" }}>Borrow history</div>
          {borrows.map((b) => (
            <div key={b.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "var(--bg-2)", borderRadius: 8, border: "1px solid var(--line-2)", fontSize: ".75rem" }}>
              <div><span style={{ fontWeight: 700, color: "var(--ink)" }}>{b.amount} QIE</span><span style={{ color: "var(--muted)", marginLeft: 6 }}>{b.service} · {b.ts}</span></div>
              <span style={{ fontSize: ".65rem", fontWeight: 800, color: b.repaid ? "#4ade80" : "#f59e0b" }}>{b.repaid ? "repaid" : "outstanding"}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {[
          { ico: <TrendingUp size={12} />, label: "Score basis", val: "Real receipts" },
          { ico: <Award size={12} />, label: "vs NeuroCred", val: "No ML oracle" },
          { ico: <Zap size={12} />, label: "QIElend pool", val: limitQie > 0 ? "Active" : "Locked" },
        ].map((c) => (
          <div key={c.label} style={{ background: "var(--bg-2)", borderRadius: 10, padding: "10px 12px", border: "1px solid var(--line-2)", textAlign: "center" }}>
            <div style={{ color: col, display: "flex", justifyContent: "center", marginBottom: 3 }}>{c.ico}</div>
            <div style={{ fontSize: ".6rem", color: "var(--muted)" }}>{c.label}</div>
            <div style={{ fontSize: ".72rem", fontWeight: 800, color: "var(--ink)" }}>{c.val}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
