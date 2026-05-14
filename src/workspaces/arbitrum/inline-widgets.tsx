/**
 * Arbitrum-specific inline widgets extracted from WorkspaceDashboard.tsx
 * All components are exported for use in widgets.tsx renderTab and in
 * WorkspaceDashboard.tsx via the import statement.
 */

import { Fragment, useState, useMemo } from "react";
import {
  Code2,
  Loader2,
  RefreshCw,
  Send,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { useAppState } from "../../app-state";
import { useLocalStore } from "../../lib/storage";
import { deterministicScore, hashId } from "../../lib/util-hash";
import { badgeFor } from "../../lib/ws-helpers";
import type { Service, Workspace } from "../../types";
import { sendErc20Transfer, parseUnits, useWallet } from "../../wallet";
import {
  Bolt,
  CAT_ICON,
  Check,
  Copy,
  Plus,
  Shield,
  X,
  catColor,
} from "../../icons402";

// ---------------------------------------------------------------------------
// ARBITRUM — Address Book (USDC/Payments tabs)
// ---------------------------------------------------------------------------
type SavedAddr = { nick: string; address: string; tag: string };
export function ArbAddressBook({ onSelect }: { onSelect?: (addr: string) => void }) {
  const [book, setBook] = useLocalStore<SavedAddr[]>("arb.addrbook", []);
  const [nick, setNick] = useState("");
  const [addr, setAddr] = useState("");
  const [tag, setTag] = useState("friend");
  const [copied, setCopied] = useState<string | null>(null);

  const add = () => {
    if (!addr.startsWith("0x") || addr.length !== 42) return;
    setBook((b) => [...b.filter((x) => x.address !== addr), { nick: nick.trim() || addr.slice(0, 8), address: addr, tag }].slice(0, 20));
    setNick(""); setAddr(""); setTag("friend");
  };
  const remove = (address: string) => setBook((b) => b.filter((x) => x.address !== address));
  const copy = (address: string) => { navigator.clipboard?.writeText(address); setCopied(address); setTimeout(() => setCopied(null), 1500); };

  const tagColor: Record<string, string> = { friend: "#3b82f6", colleague: "#8b5cf6", company: "#f59e0b", exchange: "#10b981" };

  return (
    <div className="panel block svc-flavor">
      <div className="block-head">
        <div className="ttl"><span className="sq soft">📒</span><div><h3>Address book</h3><div className="sub">save wallet addresses with nicknames · click to copy or auto-fill the USDC send form below</div></div></div>
      </div>
      <div style={{ padding: "0 16px 14px" }}>
        {/* saved entries */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8, marginBottom: 14 }}>
          {book.length === 0 && <div style={{ fontSize: ".8rem", color: "var(--muted)", padding: "8px 0" }}>No saved addresses yet.</div>}
          {book.map((e) => (
            <div key={e.address} style={{ padding: "10px 12px", borderRadius: 12, background: "var(--bg-2)", border: "1px solid var(--line-2)", display: "flex", flexDirection: "column", gap: 5 }}>
              <div className="row sm" style={{ gap: 6 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: (tagColor[e.tag] ?? "#64748b") + "22", border: `1.5px solid ${tagColor[e.tag] ?? "#64748b"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".75rem", fontWeight: 900, color: tagColor[e.tag] ?? "#64748b" }}>{e.nick[0]?.toUpperCase()}</div>
                <span style={{ fontWeight: 800, flex: 1 }}>{e.nick}</span>
                <span className="pill" style={{ background: (tagColor[e.tag] ?? "#64748b") + "18", color: tagColor[e.tag] ?? "#64748b", fontSize: ".6rem" }}>{e.tag}</span>
              </div>
              <div style={{ fontFamily: "var(--mono)", fontSize: ".66rem", color: "var(--muted)" }}>{e.address.slice(0, 10)}…{e.address.slice(-6)}</div>
              <div className="row sm" style={{ gap: 4, marginTop: 2 }}>
                <button type="button" className="btn btn-ghost btn-sm" style={{ flex: 1, fontSize: ".67rem" }} onClick={() => { copy(e.address); onSelect?.(e.address); }}>{copied === e.address ? "Copied ✓" : <><Copy width={10} height={10} /> Use</>}</button>
                <button type="button" className="btn btn-ghost btn-sm" style={{ color: "var(--muted)", fontSize: ".67rem" }} onClick={() => remove(e.address)}><X width={11} height={11} /></button>
              </div>
            </div>
          ))}
        </div>
        {/* add new */}
        <div style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid var(--line-2)", background: "var(--field)", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Save a new address</div>
          <div className="row sm" style={{ gap: 8, flexWrap: "wrap" }}>
            <input value={nick} onChange={(e) => setNick(e.currentTarget.value)} placeholder="Nickname" style={{ width: 110, padding: "7px 9px", borderRadius: 8, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".82rem" }} />
            <input value={addr} onChange={(e) => setAddr(e.currentTarget.value)} placeholder="0x… (42 chars)" style={{ flex: 1, minWidth: 160, padding: "7px 9px", borderRadius: 8, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".78rem", fontFamily: "var(--mono)" }} />
            <select value={tag} onChange={(e) => setTag(e.currentTarget.value)} style={{ padding: "7px 9px", borderRadius: 8, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".82rem" }}>{["friend", "colleague", "company", "exchange"].map((tt) => <option key={tt}>{tt}</option>)}</select>
            <button type="button" className="btn btn-acc btn-sm" onClick={add} disabled={!addr.startsWith("0x") || addr.length !== 42}><Plus width={12} height={12} /> Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ARBITRUM — Recurring Payments (USDC/Payments tab)
// ---------------------------------------------------------------------------
type RecurringEntry = { id: string; label: string; to: string; amount: number; period: "weekly" | "monthly"; nextDate: string; active: boolean; lastPaidTs?: string };
export function ArbRecurringPayments({ workspace }: { workspace: Workspace }) {
  const { emitReceipt } = useAppState();
  const { address: account } = useWallet();
  const [entries, setEntries] = useLocalStore<RecurringEntry[]>("arb.recurring", [
    { id: "rec_01", label: "API subscription", to: "0xDEAD000000000000000000000000000000beef01", amount: 25, period: "monthly", nextDate: new Date(Date.now() + 12 * 864e5).toISOString(), active: true },
  ]);
  const [label, setLabel] = useState("Service subscription");
  const [to, setTo] = useState("");
  const [amt, setAmt] = useState("10");
  const [period, setPeriod] = useState<"weekly" | "monthly">("monthly");
  const [payingId, setPayingId] = useState<string | null>(null);

  const addSchedule = () => {
    if (!to.startsWith("0x") || to.length !== 42) return;
    const nextDate = new Date(Date.now() + (period === "weekly" ? 7 : 30) * 864e5).toISOString();
    const entry: RecurringEntry = { id: "rec_" + hashId("rec", label + to + Date.now(), 6), label: label.trim(), to, amount: parseFloat(amt) || 0, period, nextDate, active: true };
    setEntries((p) => [entry, ...p].slice(0, 10));
    setLabel("Service subscription"); setTo(""); setAmt("10");
  };
  const payNow = (e: RecurringEntry) => {
    setPayingId(e.id);
    const txHash = "0x" + hashId("tx", e.to + e.amount + Date.now(), 12);
    const nextDate = new Date(Date.now() + (e.period === "weekly" ? 7 : 30) * 864e5).toISOString();
    setEntries((p) => p.map((x) => x.id === e.id ? { ...x, nextDate, lastPaidTs: new Date().toISOString() } : x));
    emitReceipt({ workspaceId: workspace.id, serviceName: `USDC · ${e.label}`, amount: e.amount, currency: "USDC", network: workspace.networks[0] ?? "arbitrum-sepolia", kind: "arb.recurring.pay", payload: { to: e.to, label: e.label, txHash, period: e.period, account } });
    setTimeout(() => setPayingId(null), 1500);
  };
  const toggle = (id: string) => setEntries((p) => p.map((x) => x.id === id ? { ...x, active: !x.active } : x));

  const daysUntil = (dt: string) => Math.max(0, Math.round((new Date(dt).getTime() - Date.now()) / 864e5));

  return (
    <div className="panel block svc-flavor">
      <div className="block-head">
        <div className="ttl"><span className="sq soft"><RefreshCw width={15} height={15} /></span><div><h3>Recurring Payments</h3><div className="sub">set up weekly or monthly USDC payments · one-click pay · track next due date · crypto direct debit</div></div></div>
        <button className="btn btn-acc btn-sm" type="button" onClick={addSchedule} disabled={!to.startsWith("0x") || to.length !== 42}><Plus width={13} height={13} /> Add schedule</button>
      </div>
      {/* add form */}
      <div style={{ padding: "0 16px 12px", display: "grid", gridTemplateColumns: "2fr 2fr 1fr 1fr", gap: 8 }}>
        <input value={label} onChange={(e) => setLabel(e.currentTarget.value)} placeholder="Label" style={{ padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".84rem" }} />
        <input value={to} onChange={(e) => setTo(e.currentTarget.value)} placeholder="0x… recipient" style={{ padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".8rem", fontFamily: "var(--mono)" }} />
        <input value={amt} onChange={(e) => setAmt(e.currentTarget.value)} inputMode="decimal" placeholder="USDC" style={{ padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".84rem" }} />
        <select value={period} onChange={(e) => setPeriod(e.currentTarget.value as typeof period)} style={{ padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".84rem" }}>
          <option value="weekly">Weekly</option><option value="monthly">Monthly</option>
        </select>
      </div>
      {/* scheduled payments */}
      <div style={{ padding: "0 16px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
        {entries.length === 0 && <div style={{ fontSize: ".8rem", color: "var(--muted)" }}>No recurring payments yet.</div>}
        {entries.map((e) => {
          const days = daysUntil(e.nextDate);
          const urgencyCol = days <= 3 ? "var(--red)" : days <= 7 ? "#f59e0b" : "var(--green)";
          return (
            <div key={e.id} style={{ padding: "12px 14px", borderRadius: 12, background: "var(--bg-2)", border: `1px solid ${e.active ? "#3b82f640" : "var(--line-2)"}`, opacity: e.active ? 1 : 0.55 }}>
              <div className="row sm" style={{ gap: 8, marginBottom: 4 }}>
                <span style={{ fontWeight: 800, flex: 1 }}>{e.label}</span>
                <span className="pill" style={{ background: "#3b82f618", color: "#3b82f6", fontSize: ".62rem", fontWeight: 700 }}>{e.amount} USDC · {e.period}</span>
                <span style={{ fontSize: ".68rem", fontWeight: 800, color: urgencyCol }}>in {days}d</span>
              </div>
              <div style={{ fontFamily: "var(--mono)", fontSize: ".7rem", color: "var(--muted)", marginBottom: 8 }}>{e.to.slice(0, 14)}…{e.to.slice(-6)}</div>
              <div className="row sm" style={{ gap: 6 }}>
                <span style={{ fontSize: ".68rem", color: "var(--muted)", flex: 1 }}>Next: {new Date(e.nextDate).toLocaleDateString()}</span>
                <button type="button" className="btn btn-acc btn-sm" style={{ fontSize: ".7rem" }} onClick={() => payNow(e)} disabled={payingId === e.id}>{payingId === e.id ? <><Check width={10} height={10} /> Paid!</> : "Pay now →"}</button>
                <button type="button" className="btn btn-ghost btn-sm" style={{ fontSize: ".7rem" }} onClick={() => toggle(e.id)}>{e.active ? "Pause" : "Resume"}</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ARBITRUM — Allowance Manager / Wallet Protection (Wallet Protection tab)
// ---------------------------------------------------------------------------
type AllowanceEntry = { protocol: string; token: string; allowance: "unlimited" | "high" | "safe"; amount: string; riskLevel: "red" | "yellow" | "green"; revoked: boolean };
export function ArbAllowanceManager({ workspace }: { workspace: Workspace }) {
  const { emitReceipt } = useAppState();
  const [entries, setEntries] = useLocalStore<AllowanceEntry[]>("arb.allowances", [
    { protocol: "Uniswap V3", token: "USDC", allowance: "unlimited", amount: "∞", riskLevel: "red", revoked: false },
    { protocol: "Arbitrum Bridge", token: "USDC", allowance: "high", amount: "$10,000", riskLevel: "yellow", revoked: false },
    { protocol: "Aave V3", token: "USDT", allowance: "safe", amount: "$500", riskLevel: "green", revoked: false },
    { protocol: "Unknown dApp", token: "ARB", allowance: "unlimited", amount: "∞", riskLevel: "red", revoked: false },
  ]);
  const [maxCap, setMaxCap] = useState("1000");
  const riskCol = { red: "var(--red)", yellow: "#f59e0b", green: "var(--green)" } as const;
  const riskLabel = { red: "UNLIMITED ⚠️", yellow: "High", green: "Safe" } as const;

  const revoke = (protocol: string) => {
    setEntries((p) => p.map((e) => e.protocol === protocol ? { ...e, revoked: true, allowance: "safe", amount: "$0", riskLevel: "green" } : e));
    emitReceipt({ workspaceId: workspace.id, serviceName: `Revoke · ${protocol}`, amount: 0, currency: "USDC", network: workspace.networks[0] ?? "arbitrum-sepolia", kind: "arb.allowance.revoke", payload: { protocol } });
  };
  const setCap = () => {
    emitReceipt({ workspaceId: workspace.id, serviceName: "Wallet Protection · Max Cap", amount: 0, currency: "USDC", network: workspace.networks[0] ?? "arbitrum-sepolia", kind: "arb.allowance.cap", payload: { maxCapUsd: parseFloat(maxCap) } });
  };

  const redCount = entries.filter((e) => e.riskLevel === "red" && !e.revoked).length;

  return (
    <div className="panel block svc-flavor">
      <div className="block-head">
        <div className="ttl"><span className="sq soft"><ShieldCheck width={15} height={15} /></span><div><h3>Wallet Protection</h3><div className="sub">see who has approval to spend your tokens · revoke unlimited allowances · set a max cap</div></div></div>
        {redCount > 0 && <span className="pill" style={{ background: "color-mix(in srgb,var(--red) 18%,transparent)", color: "var(--red)", fontWeight: 800, fontSize: ".72rem" }}>⚠️ {redCount} risky approval{redCount > 1 ? "s" : ""}</span>}
      </div>
      <div style={{ padding: "0 16px 12px" }}>
        <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--muted)", marginBottom: 8 }}>Active approvals</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {entries.map((e) => (
            <div key={e.protocol} style={{ padding: "10px 14px", borderRadius: 12, background: "var(--bg-2)", border: `1px solid ${e.revoked ? "var(--line-2)" : riskCol[e.riskLevel] + "30"}`, opacity: e.revoked ? 0.5 : 1 }}>
              <div className="row sm" style={{ gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: e.revoked ? "var(--muted)" : riskCol[e.riskLevel], flexShrink: 0 }} />
                <span style={{ fontWeight: 800, flex: 1 }}>{e.protocol}</span>
                <span style={{ fontSize: ".72rem", color: "var(--muted)" }}>{e.token}</span>
                <span style={{ fontSize: ".72rem", fontWeight: 800, color: e.revoked ? "var(--muted)" : riskCol[e.riskLevel] }}>{e.revoked ? "Revoked" : riskLabel[e.riskLevel]}</span>
                {!e.revoked && <button type="button" className="btn btn-ghost btn-sm" style={{ fontSize: ".68rem", color: e.riskLevel === "red" ? "var(--red)" : "var(--muted)" }} onClick={() => revoke(e.protocol)}>Revoke</button>}
              </div>
              {!e.revoked && <div style={{ marginTop: 3, fontSize: ".7rem", color: "var(--muted)" }}>Approved: {e.amount} {e.token}</div>}
            </div>
          ))}
        </div>
        {/* max cap */}
        <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 12, border: "1px solid var(--line-2)", background: "var(--field)" }}>
          <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--muted)", marginBottom: 8 }}>Set max USDC approval cap</div>
          <div className="row sm" style={{ gap: 8 }}>
            <span style={{ fontSize: ".8rem", color: "var(--muted)" }}>Max any protocol can approve:</span>
            <input value={maxCap} onChange={(e) => setMaxCap(e.currentTarget.value)} inputMode="decimal" style={{ width: 90, padding: "7px 9px", borderRadius: 8, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".85rem" }} />
            <span style={{ fontSize: ".8rem" }}>USDC</span>
            <button type="button" className="btn btn-acc btn-sm" onClick={setCap}>Save cap</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ARBITRUM — Contract Payment Simulator (Stylus Contracts tab)
// ---------------------------------------------------------------------------
export function ArbContractPaymentSim({ workspace }: { workspace: Workspace }) {
  const { emitReceipt } = useAppState();
  const [fnSig, setFnSig] = useState("unlock(bytes32 key)");
  const [amount, setAmount] = useState("1.00");
  const [result, setResult] = useState<{ calldata: string; gas: string; output: string } | null>(null);

  const simulate = () => {
    const hexAmt = parseInt(amount).toString(16).padStart(64, "0");
    const calldata = "0x" + hashId("4bytes", fnSig, 4) + "000000000000000000000000000000000000000000000000000000000000002" + hexAmt.slice(-2);
    const gas = (21000 + fnSig.length * 68 + Math.floor(deterministicScore(fnSig, 10000, 60000))).toLocaleString();
    const output = `{ "status": "success", "result": "0x${hashId("res", fnSig + amount, 12)}", "gasUsed": ${gas.replace(/,/g, "")}, "receiptId": "arb_${hashId("rcpt", fnSig + Date.now(), 8)}" }`;
    setResult({ calldata, gas, output });
    emitReceipt({ workspaceId: workspace.id, serviceName: "Stylus · Contract Payment Sim", amount: parseFloat(amount) || 0, currency: "USDC", network: workspace.networks[0] ?? "arbitrum-sepolia", kind: "arb.contract.sim", payload: { fnSig, amount, calldata } });
  };

  return (
    <div className="panel block svc-flavor">
      <div className="block-head">
        <div className="ttl"><span className="sq soft"><Code2 width={15} height={15} /></span><div><h3>Contract Payment Simulator</h3><div className="sub">paste an ABI function signature + amount → see calldata, gas estimate, and expected output before deploying</div></div></div>
        <button className="btn btn-acc btn-sm" type="button" onClick={simulate}><Zap width={13} height={13} /> Simulate call</button>
      </div>
      <div style={{ padding: "0 16px 12px", display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>ABI function signature</span>
          <input value={fnSig} onChange={(e) => setFnSig(e.currentTarget.value)} placeholder="functionName(type arg)" style={{ padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".84rem", fontFamily: "var(--mono)" }} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Payment (USDC)</span>
          <input value={amount} onChange={(e) => setAmount(e.currentTarget.value)} inputMode="decimal" style={{ padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".84rem" }} />
        </label>
      </div>
      {result && (
        <div style={{ padding: "0 16px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { label: "Calldata", val: result.calldata, mono: true },
            { label: `Estimated gas: ${result.gas}`, val: result.output, mono: true },
          ].map((r) => (
            <div key={r.label} style={{ padding: "8px 12px", borderRadius: 10, background: "color-mix(in srgb, #3b82f6 6%, var(--bg-2))", border: "1px solid #3b82f625" }}>
              <div style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "#3b82f6", fontWeight: 700, marginBottom: 4 }}>{r.label}</div>
              <code style={{ fontSize: ".7rem", color: "var(--ink)", wordBreak: "break-all" }}>{r.val}</code>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ARBITRUM — x402 Payment Flow Diagram (USDC/Payments tab)
// ---------------------------------------------------------------------------
export function ArbPaymentFlowDiagram() {
  const nodes = [
    { id: "req",    label: "Request",    sub: "Agent calls API",            col: "#64748b" },
    { id: "402",    label: "402",        sub: "Gateway returns challenge",   col: "#f59e0b" },
    { id: "pay",    label: "Pay",        sub: "USDC transfer on Arbitrum",   col: "#3b82f6" },
    { id: "verify", label: "Verify",     sub: "Server checks proof on-chain",col: "#8b5cf6" },
    { id: "unlock", label: "Unlock",     sub: "Response + receipt issued",   col: "#10b981" },
  ] as const;

  return (
    <div className="panel block svc-flavor">
      <div className="block-head">
        <div className="ttl"><span className="sq soft"><Zap width={15} height={15} /></span><div><h3>x402 payment flow</h3><div className="sub">how every USDC transfer settles on Arbitrum — automated in &lt;3s</div></div></div>
      </div>
      <div style={{ padding: "0 16px 20px" }}>
        {/* flow nodes */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 0, overflowX: "auto", paddingBottom: 4 }}>
          {nodes.map((node, i) => (
            <Fragment key={node.id}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, minWidth: 88 }}>
                <div style={{ width: 52, height: 52, borderRadius: "50%", background: node.col + "18", border: `2.5px solid ${node.col}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontWeight: 900, fontSize: node.label === "402" ? ".95rem" : ".78rem", color: node.col, letterSpacing: node.label === "402" ? ".02em" : ".04em" }}>{node.label}</span>
                </div>
                <span style={{ fontSize: ".65rem", color: "var(--muted)", textAlign: "center", maxWidth: 82, lineHeight: 1.35 }}>{node.sub}</span>
              </div>
              {i < nodes.length - 1 && (
                <div style={{ display: "flex", alignItems: "center", marginTop: 14, flex: 1, minWidth: 20 }}>
                  <svg width="100%" height="20" viewBox="0 0 40 20" preserveAspectRatio="none" style={{ minWidth: 20 }}>
                    <defs><marker id={`arr${i}`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill={nodes[i + 1]!.col} /></marker></defs>
                    <line x1="0" y1="10" x2="36" y2="10" stroke={nodes[i + 1]!.col} strokeWidth="1.8" markerEnd={`url(#arr${i})`} />
                  </svg>
                </div>
              )}
            </Fragment>
          ))}
        </div>
        {/* bottom note */}
        <div style={{ marginTop: 14, padding: "8px 14px", borderRadius: 10, background: "color-mix(in srgb, #3b82f6 8%, var(--bg-2))", border: "1px solid #3b82f630", fontSize: ".73rem", color: "var(--muted)", lineHeight: 1.5 }}>
          <span style={{ fontWeight: 800, color: "#3b82f6" }}>On Arbitrum Sepolia</span> — USDC contract <code style={{ fontSize: ".68rem", background: "var(--bg-1)", padding: "1px 5px", borderRadius: 4 }}>0x75faf114…</code> · settlement is final in &lt;1 block · proof is single-use and challenge-bound
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ARBITRUM — USDC Transfer widget
// ---------------------------------------------------------------------------
export function UsdcTransferWidget({ workspace }: { workspace: Workspace }) {
  const w = useWallet();
  const { emitReceipt } = useAppState();
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("5.00");
  const [stage, setStage] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const USDC_ARB_SEPOLIA = "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d";

  const send = async () => {
    if (!w.address) { await w.connect(); return; }
    if (!to.trim() || !parseFloat(amount)) return;
    const provider = typeof window !== "undefined" ? (window as { ethereum?: Parameters<typeof sendErc20Transfer>[0] }).ethereum : undefined;
    if (!provider) { setErrMsg("No wallet provider found"); return; }
    setStage("sending"); setErrMsg(null);
    try {
      const hash = await sendErc20Transfer(provider, w.address, USDC_ARB_SEPOLIA, to.trim(), parseUnits(amount, 6));
      setTxHash(hash);
      emitReceipt({ workspaceId: workspace.id, serviceName: "USDC Settlement API", amount: parseFloat(amount), currency: "USDC", network: "arbitrum-sepolia", kind: "arb.usdc.transfer", payload: { to: to.trim(), amount, txHash: hash } });
      setStage("done");
    } catch (e: unknown) {
      setErrMsg(e instanceof Error ? e.message : "Transaction failed");
      setStage("error");
    }
  };

  return (
    <div className="panel block svc-flavor">
      <div className="block-head"><div className="ttl"><span className="sq soft"><Send width={15} height={15} /></span><div><h3>Send USDC</h3><div className="sub">settle a payment directly on Arbitrum · wallet signs ERC-20 transfer</div></div></div></div>
      <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Recipient address</span>
            <input value={to} onChange={(e) => setTo(e.currentTarget.value)} placeholder="0x…" style={{ padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontFamily: "var(--mono)", fontSize: ".78rem" }} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Amount (USDC)</span>
            <input value={amount} onChange={(e) => setAmount(e.currentTarget.value)} inputMode="decimal" placeholder="5.00" style={{ padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".84rem" }} />
          </label>
        </div>
        {!w.address
          ? <button className="btn btn-acc btn-sm" type="button" onClick={() => void w.connect()} disabled={w.connecting}>{w.connecting ? "Connecting…" : "Connect wallet to send"}</button>
          : <button className="btn btn-acc btn-sm" type="button" onClick={send} disabled={stage === "sending" || !to.trim() || !parseFloat(amount)}>
              {stage === "sending" ? <><Loader2 size={13} className="wallet-spin" /> Sending…</> : <><Send size={13} /> Send USDC</>}
            </button>
        }
        {stage === "done" && txHash && (
          <div style={{ padding: "8px 12px", borderRadius: 10, background: "color-mix(in srgb, var(--green) 12%, transparent)", color: "var(--green)", fontSize: ".78rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 7 }}>
            <Check width={14} height={14} /> Sent · <code style={{ background: "rgba(0,0,0,.14)", padding: "1px 5px", borderRadius: 5 }}>{txHash.slice(0, 12)}…</code>
          </div>
        )}
        {stage === "error" && errMsg && (
          <div style={{ padding: "8px 12px", borderRadius: 10, background: "color-mix(in srgb, var(--red) 12%, transparent)", color: "var(--red)", fontSize: ".78rem", fontWeight: 700 }}>
            {errMsg}
          </div>
        )}
        <div className="cm-note"><Shield width={13} height={13} /> Sends real USDC on Arbitrum Sepolia testnet. Ensure you have test tokens and the right network selected.</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ARBITRUM — Agent Service Registry (Agent Marketplace tab)
// ---------------------------------------------------------------------------
type RegService = { svcId: string; name: string; category: string; price: number; network: string; gatewayUrl: string; providerWallet: string; createdAt: string; status: "active" | "inactive" };
const SEED_REG_SERVICES: RegService[] = [
  { svcId: "svc_arb_a1", name: "Orbit Bridge Health API", category: "data", price: 0.004, network: "arbitrum-sepolia", gatewayUrl: "/arbitrum/orbit-bridge-health", providerWallet: "0xa17e0b9c4d21f00ab12c", createdAt: new Date(Date.now() - 864e5).toISOString(), status: "active" },
  { svcId: "svc_arb_a2", name: "USDC Settlement Webhook", category: "payments", price: 0.002, network: "arbitrum-sepolia", gatewayUrl: "/arbitrum/usdc-settlement-webhook", providerWallet: "0xcc91f0e7a3b2d4e5f607", createdAt: new Date(Date.now() - 3 * 864e5).toISOString(), status: "active" },
];
const REG_CATS = ["data", "inference", "payments", "risk", "oracle"] as const;
function slugify(s: string) { return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "service"; }

export function AgentServiceRegistry({ workspace, onOpenPayment }: { workspace: Workspace; onOpenPayment: (s: Service) => void }) {
  const { emitReceipt, receipts } = useAppState();
  const [list, setList] = useLocalStore<RegService[]>("arb.services", SEED_REG_SERVICES);
  const [name, setName] = useState("Stablecoin Invoice API");
  const [category, setCategory] = useState<typeof REG_CATS[number]>("payments");
  const [price, setPrice] = useState("0.02");
  const [network, setNetwork] = useState(workspace.networks[0] ?? "arbitrum-sepolia");
  const registrations = useMemo(() => receipts.filter((r) => r.workspaceId === workspace.id && r.kind === "arb.service.register").slice(0, 6), [receipts, workspace.id]);

  const register = () => {
    const p = parseFloat(price) || 0.01;
    const svcId = "svc_arb_" + hashId("svc", name + category, 6);
    const gatewayUrl = `/arbitrum/${slugify(name)}`;
    const providerWallet = "0x" + hashId("0xprov", name + workspace.id, 12);
    const reg: RegService = { svcId, name: name.trim() || "Unnamed service", category, price: p, network, gatewayUrl, providerWallet, createdAt: new Date().toISOString(), status: "active" };
    setList((prev) => [reg, ...prev.filter((x) => x.svcId !== svcId)].slice(0, 20));
    emitReceipt({ workspaceId: workspace.id, serviceId: svcId, serviceName: reg.name, amount: 0.01, currency: "USDC", network, kind: "arb.service.register", payload: { svcId, category, price: p, gatewayUrl, providerWallet } });
  };

  const testCall = (r: RegService) => {
    const adHoc: Service = {
      id: r.svcId, workspaceIds: [workspace.id], name: r.name, provider: "You (registered)", providerWallet: r.providerWallet,
      category: r.category, price: `${r.price.toFixed(3)} USDC`, priceUsd: r.price, currency: "USDC", network: r.network,
      description: `Registered ${r.category} service on the Arbitrum agent-services registry.`, sampleIn: `{ "input": "…" }`,
      response: `{ "ok": true, "service": "${r.svcId}", "result": "…" }`, latency: "~120ms", calls: 0, status: "active",
    };
    onOpenPayment(adHoc);
  };

  const setStatus = (svcId: string, status: RegService["status"]) => setList((prev) => prev.map((x) => x.svcId === svcId ? { ...x, status } : x));

  return (
    <div className="panel block svc-flavor">
      <div className="block-head">
        <div className="ttl"><span className="sq soft"><Plus width={15} height={15} /></span><div><h3>Agent service registry</h3><div className="sub">register an x402-gated agent service · get a gateway URL + provider wallet · test it with a real 402 call</div></div></div>
        <button className="btn btn-acc btn-sm" type="button" onClick={register}><Plus width={13} height={13} /> Register service</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1.4fr", gap: 10, padding: "0 16px 12px" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Service name</span>
          <input value={name} onChange={(e) => setName(e.currentTarget.value)} style={{ padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".84rem" }} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Category</span>
          <select value={category} onChange={(e) => setCategory(e.currentTarget.value as typeof category)} style={{ padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".84rem", textTransform: "capitalize" }}>{REG_CATS.map((c) => <option key={c}>{c}</option>)}</select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Price USDC</span>
          <input value={price} onChange={(e) => setPrice(e.currentTarget.value)} inputMode="decimal" style={{ padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".84rem", fontVariantNumeric: "tabular-nums" }} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Network</span>
          <select value={network} onChange={(e) => setNetwork(e.currentTarget.value)} style={{ padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".84rem" }}>{(workspace.networks.length ? workspace.networks : ["arbitrum-sepolia"]).map((n) => <option key={n}>{n}</option>)}</select>
        </label>
      </div>
      <div style={{ padding: "0 16px 14px" }}>
        <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--muted)", padding: "6px 0" }}>Registered services · {list.length}</div>
        <div className="svc-ep-grid">
          {list.map((r) => {
            const Ico = CAT_ICON[r.category] ?? CAT_ICON.data;
            const rating = deterministicScore("rating_" + r.svcId, 3.2, 5.0);
            const stars = Math.round(rating);
            const callCount = Math.round(deterministicScore("calls_" + r.svcId, 18, 2800));
            return (
              <div key={r.svcId} className="svc-ep-card">
                <div className="svc-ep-card__top">
                  <span className="sq sm" style={{ background: catColor(r.category) }}><Ico width={13} height={13} /></span>
                  <div className="svc-ep-card__id"><b>{r.name}</b><code>{r.gatewayUrl}</code></div>
                  {badgeFor(r.status === "active" ? "active" : "paused")}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "2px 0 4px" }}>
                  <span style={{ color: "#ff9b00", fontSize: ".8rem", letterSpacing: "-.03em" }}>{"★".repeat(stars)}{"☆".repeat(5 - stars)}</span>
                  <span style={{ fontSize: ".65rem", color: "var(--muted)", fontWeight: 600 }}>{rating.toFixed(1)} · {callCount.toLocaleString()} calls</span>
                </div>
                <div className="svc-ep-card__meta">
                  <span><b>${r.price.toFixed(3)}</b> USDC</span><span>{r.category}</span><span>{r.network}</span><span style={{ fontFamily: "var(--mono)" }}>{r.providerWallet.slice(0, 10)}…</span>
                </div>
                <div className="row sm" style={{ gap: 6 }}>
                  <button className="btn btn-acc btn-sm" type="button" disabled={r.status !== "active"} onClick={() => testCall(r)} style={{ flex: 1, justifyContent: "center" }}><Bolt width={12} height={12} /> Test call (pay &amp; unlock)</button>
                  <button className="btn btn-ghost btn-sm" type="button" onClick={() => setStatus(r.svcId, r.status === "active" ? "inactive" : "active")}>{r.status === "active" ? "Pause" : "Resume"}</button>
                </div>
              </div>
            );
          })}
          {list.length === 0 && <div className="muted sm" style={{ padding: "10px 4px" }}>No services registered — register one above.</div>}
        </div>
        {registrations.length > 0 && (
          <>
            <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--muted)", padding: "10px 0 4px" }}>Recent registrations · {registrations.length}</div>
            <div className="svc-hist">{registrations.map((r) => { const p = (r.payload ?? {}) as { svcId?: string; gatewayUrl?: string }; return (
              <div className="svc-hist__row" key={r.id}><span className="svc-hist__dot" style={{ background: "var(--accent-primary)" }} /><div className="svc-hist__main"><b>{r.serviceName}</b><span>{p.gatewayUrl} · {p.svcId}</span></div>{badgeFor(r.status)}<span className="svc-hist__amt">{r.amount.toFixed(2)}</span></div>
            ); })}</div>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ARBITRUM — Spend Rules Editor (Risk Rules tab)
// ---------------------------------------------------------------------------
type SpendRules = { maxPerRequestUsd: number; dailyLimitUsd: number; allowedServiceIds: string[]; blockedAddresses: string[]; network: string; autoPay: boolean };
const makeDefaultRules = (services: Service[], net: string): SpendRules => ({ maxPerRequestUsd: 0.25, dailyLimitUsd: 12, allowedServiceIds: services.slice(0, 4).map((s) => s.id), blockedAddresses: ["0x000000000000000000000000000000000000dead"], network: net, autoPay: true });

export function SpendRulesEditor({ workspace, services }: { workspace: Workspace; services: Service[] }) {
  const { emitReceipt, receipts } = useAppState();
  const net0 = workspace.networks[0] ?? "arbitrum-sepolia";
  const [rules, setRules] = useLocalStore<SpendRules>("arb.risk.rules", makeDefaultRules(services, net0));
  const [blocked, setBlocked] = useState(rules.blockedAddresses.join("\n"));
  const [testSvc, setTestSvc] = useState(services[0]?.id ?? "");
  const [testAmt, setTestAmt] = useState("0.15");
  const [testAddr, setTestAddr] = useState("");
  const [testResult, setTestResult] = useState<{ pass: boolean; reason: string } | null>(null);
  const [publishedId, setPublishedId] = useState<string | null>(null);

  const spentToday = useMemo(() => receipts.filter((r) => r.workspaceId === workspace.id && (r.kind ?? "").startsWith("arb.") && new Date(r.createdAt).toDateString() === new Date().toDateString()).reduce((s, r) => s + r.amount, 0), [receipts, workspace.id]);
  const publishes = useMemo(() => receipts.filter((r) => r.workspaceId === workspace.id && r.kind === "arb.risk.publish").slice(0, 6), [receipts, workspace.id]);

  const toggleSvc = (id: string) => setRules((r) => ({ ...r, allowedServiceIds: r.allowedServiceIds.includes(id) ? r.allowedServiceIds.filter((x) => x !== id) : [...r.allowedServiceIds, id] }));

  const publish = () => {
    const next: SpendRules = { ...rules, blockedAddresses: blocked.split(/\s+/).map((x) => x.trim().toLowerCase()).filter(Boolean) };
    setRules(next);
    const rulesetId = "rules_" + hashId("rules", JSON.stringify(next) + Date.now(), 8);
    emitReceipt({ workspaceId: workspace.id, serviceName: "Risk Ruleset · Publish", amount: 0, currency: "USDC", network: next.network, kind: "arb.risk.publish", payload: { rulesetId, maxPerRequestUsd: next.maxPerRequestUsd, dailyLimitUsd: next.dailyLimitUsd, allowlistCount: next.allowedServiceIds.length, blockedCount: next.blockedAddresses.length, autoPay: next.autoPay } });
    setPublishedId(rulesetId);
  };

  const runTest = () => {
    const svc = services.find((s) => s.id === testSvc);
    const amt = parseFloat(testAmt) || 0;
    const blockedNow = blocked.split(/\s+/).map((x) => x.trim().toLowerCase()).filter(Boolean);
    let pass = true, reason = "All rules satisfied";
    if (!rules.autoPay) { pass = false; reason = "auto-pay is disabled — human approval required"; }
    else if (!svc) { pass = false; reason = "unknown service"; }
    else if (amt > rules.maxPerRequestUsd) { pass = false; reason = `amount $${amt.toFixed(3)} > max-per-request $${rules.maxPerRequestUsd.toFixed(3)}`; }
    else if (spentToday + amt > rules.dailyLimitUsd) { pass = false; reason = `would exceed daily limit ($${(spentToday + amt).toFixed(2)} > $${rules.dailyLimitUsd.toFixed(2)})`; }
    else if (rules.allowedServiceIds.length && !rules.allowedServiceIds.includes(testSvc)) { pass = false; reason = "service not on the allowlist"; }
    else if (blockedNow.includes(testAddr.trim().toLowerCase())) { pass = false; reason = "counterparty address is denylisted"; }
    else if (svc.network !== rules.network) { pass = false; reason = `service network ${svc.network} ≠ allowed ${rules.network}`; }
    setTestResult({ pass, reason });
    if (pass) emitReceipt({ workspaceId: workspace.id, serviceId: testSvc, serviceName: "Risk Check · Pass", amount: 0, currency: "USDC", network: rules.network, kind: "arb.risk.test", payload: { serviceId: testSvc, amount: amt, from: testAddr.trim(), result: "pass" } });
  };

  const protectPct = Math.round((spentToday / rules.dailyLimitUsd) * 100);

  return (
    <div className="panel block svc-flavor">
      <div className="block-head" style={{ borderBottom: "1px solid var(--line-2)", paddingBottom: 12 }}>
        <div className="ttl"><span className="sq soft"><ShieldCheck width={15} height={15} /></span><div><h3>Spend limits · agent protection</h3><div className="sub">Stop an agent from draining your wallet — set a daily cap and it cannot spend more</div></div></div>
        <button className="btn btn-acc btn-sm" type="button" onClick={publish}><Check width={13} height={13} /> Save ruleset</button>
      </div>

      {/* Quick protect hero */}
      <div style={{ margin: "14px 16px 12px", padding: "14px 16px", borderRadius: 14, border: "1px solid color-mix(in srgb, var(--accent-primary) 25%, var(--line-2))", background: "color-mix(in srgb, var(--accent-primary) 5%, transparent)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: ".9rem" }}>Daily spend cap</div>
            <div style={{ fontSize: ".7rem", color: "var(--muted)" }}>Agent cannot spend more than this per day — ever</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "1.6rem", fontWeight: 900, letterSpacing: "-.04em", color: "var(--accent-primary)", lineHeight: 1 }}>${rules.dailyLimitUsd}</div>
            <div style={{ fontSize: ".65rem", color: "var(--muted)" }}>USDC / day</div>
          </div>
        </div>
        <input type="range" min={1} max={100} step={1} value={rules.dailyLimitUsd} onChange={(e) => setRules((r) => ({ ...r, dailyLimitUsd: parseFloat(e.currentTarget.value) }))} style={{ width: "100%", accentColor: "var(--accent-primary)" }} />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".62rem", color: "var(--muted)", marginTop: 2 }}>
          <span>$1</span><span>$50</span><span>$100</span>
        </div>
        {/* Spent today bar */}
        <div style={{ marginTop: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".68rem", color: "var(--muted)", marginBottom: 4 }}>
            <span>Spent today: <b style={{ color: "var(--ink)" }}>${spentToday.toFixed(2)}</b></span>
            <span>Remaining: <b style={{ color: protectPct < 80 ? "#1fb58a" : "#e63946" }}>${Math.max(0, rules.dailyLimitUsd - spentToday).toFixed(2)}</b></span>
          </div>
          <div style={{ height: 6, borderRadius: 6, background: "var(--line-2)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.min(100, protectPct)}%`, background: protectPct >= 80 ? "#e63946" : "var(--accent-primary)", borderRadius: 6, transition: "width .3s" }} />
          </div>
        </div>
        {publishedId && <div style={{ marginTop: 8, fontSize: ".68rem", color: "var(--green)", fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}><Check width={12} height={12} /> Saved — ruleset ID {publishedId.slice(0, 16)}</div>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, padding: "0 16px 10px" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Max per request (USDC)</span>
          <input value={String(rules.maxPerRequestUsd)} onChange={(e) => setRules((r) => ({ ...r, maxPerRequestUsd: parseFloat(e.currentTarget.value) || 0 }))} inputMode="decimal" style={{ padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".84rem" }} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Daily limit (USDC)</span>
          <input value={String(rules.dailyLimitUsd)} onChange={(e) => setRules((r) => ({ ...r, dailyLimitUsd: parseFloat(e.currentTarget.value) || 0 }))} inputMode="decimal" style={{ padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".84rem" }} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Allowed network</span>
          <select value={rules.network} onChange={(e) => setRules((r) => ({ ...r, network: e.currentTarget.value }))} style={{ padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".84rem" }}>{(workspace.networks.length ? workspace.networks : ["arbitrum-sepolia"]).map((n) => <option key={n}>{n}</option>)}</select>
        </label>
      </div>
      <div style={{ padding: "0 16px 10px" }}>
        <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Allowed services</span>
        <div className="row sm" style={{ gap: 6, flexWrap: "wrap", marginTop: 6 }}>
          {services.map((s) => (
            <button key={s.id} type="button" className={"pill click" + (rules.allowedServiceIds.includes(s.id) ? " on" : "")} onClick={() => toggleSvc(s.id)}>{rules.allowedServiceIds.includes(s.id) ? <Check width={11} height={11} /> : null} {s.name}</button>
          ))}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, padding: "0 16px 12px" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Denylisted addresses (one per line)</span>
          <textarea value={blocked} onChange={(e) => setBlocked(e.currentTarget.value)} rows={2} style={{ padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontFamily: "var(--mono)", fontSize: ".72rem", resize: "vertical" }} />
        </label>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, justifyContent: "center" }}>
          <label className="row sm" style={{ gap: 8, fontSize: ".82rem", cursor: "pointer" }}>
            <input type="checkbox" checked={rules.autoPay} onChange={(e) => setRules((r) => ({ ...r, autoPay: e.currentTarget.checked }))} /> Auto-pay enabled (agent settles without human approval)
          </label>
          <div style={{ fontSize: ".72rem", color: "var(--muted)" }}>Spent today (arb.*): <b style={{ color: "var(--ink)" }}>${spentToday.toFixed(3)}</b> · headroom <b style={{ color: "var(--ink)" }}>${Math.max(0, rules.dailyLimitUsd - spentToday).toFixed(3)}</b></div>
          {publishedId && <div style={{ fontSize: ".72rem", color: "var(--green)", fontWeight: 700 }}><Check width={12} height={12} /> Published <code style={{ background: "rgba(0,0,0,.14)", padding: "1px 5px", borderRadius: 5 }}>{publishedId}</code></div>}
        </div>
      </div>
      {/* IF-THEN rule cards */}
      <div style={{ padding: "0 16px 10px" }}>
        <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--muted)", marginBottom: 8 }}>Active rules · IF → THEN</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 8 }}>
          {([
            { cond: `amount > $${rules.maxPerRequestUsd}`, action: "BLOCK payment", color: "#e63946" },
            { cond: `daily spend > $${rules.dailyLimitUsd}`, action: "BLOCK payment", color: "#e63946" },
            { cond: "service NOT on allowlist", action: "REJECT call", color: "#ff9b00" },
            { cond: "address on denylist", action: "REJECT call", color: "#ff9b00" },
            { cond: `network ≠ ${rules.network}`, action: "REJECT call", color: "#ff9b00" },
            { cond: rules.autoPay ? "all rules pass" : "any rule checked", action: rules.autoPay ? "AUTO-PAY ✓" : "REQUEST approval", color: rules.autoPay ? "#1fb58a" : "#3aa0e6" },
          ] as { cond: string; action: string; color: string }[]).map(({ cond, action, color }) => (
            <div key={cond} style={{ borderRadius: 10, border: `1px solid color-mix(in srgb, ${color} 25%, var(--line-2))`, background: `color-mix(in srgb, ${color} 5%, var(--bg-2))`, padding: "9px 12px" }}>
              <div style={{ fontSize: ".6rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", marginBottom: 4 }}>IF</div>
              <div style={{ fontSize: ".78rem", fontWeight: 700, color: "var(--ink)", marginBottom: 6 }}>{cond}</div>
              <div style={{ fontSize: ".6rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", marginBottom: 4 }}>THEN</div>
              <div style={{ fontSize: ".78rem", fontWeight: 900, color }}>{action}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ margin: "0 16px 14px", padding: "10px 14px", borderRadius: 12, border: "1px solid var(--line-2)", background: "var(--field)" }}>
        <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--muted)", marginBottom: 8 }}>Test a request against the live rules</div>
        <div className="row sm" style={{ gap: 8, flexWrap: "wrap" }}>
          <select value={testSvc} onChange={(e) => setTestSvc(e.currentTarget.value)} style={{ padding: "7px 9px", borderRadius: 8, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".8rem" }}>{services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
          <input value={testAmt} onChange={(e) => setTestAmt(e.currentTarget.value)} inputMode="decimal" placeholder="amount" style={{ width: 80, padding: "7px 9px", borderRadius: 8, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".8rem" }} />
          <input value={testAddr} onChange={(e) => setTestAddr(e.currentTarget.value)} placeholder="from address" style={{ flex: 1, minWidth: 180, padding: "7px 9px", borderRadius: 8, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".78rem", fontFamily: "var(--mono)" }} />
          <button className="btn btn-sm" type="button" onClick={runTest}>Evaluate</button>
        </div>
        {testResult && (
          <div style={{ marginTop: 8, padding: "7px 12px", borderRadius: 10, background: `color-mix(in srgb, ${testResult.pass ? "var(--green)" : "var(--red)"} 12%, transparent)`, color: testResult.pass ? "var(--green)" : "var(--red)", fontSize: ".78rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 7 }}>
            {testResult.pass ? <Check width={13} height={13} /> : <X width={13} height={13} />} {testResult.pass ? "PASS" : "BLOCK"} — {testResult.reason}
          </div>
        )}
      </div>
      {publishes.length > 0 && (
        <div style={{ padding: "0 16px 14px" }}>
          <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--muted)", padding: "6px 0" }}>Recent ruleset changes · {publishes.length}</div>
          <div className="svc-hist">{publishes.map((r) => { const p = (r.payload ?? {}) as { rulesetId?: string; maxPerRequestUsd?: number; dailyLimitUsd?: number; allowlistCount?: number }; return (
            <div className="svc-hist__row" key={r.id}><span className="svc-hist__dot" style={{ background: "var(--accent-primary)" }} /><div className="svc-hist__main"><b>{p.rulesetId}</b><span>cap ${p.maxPerRequestUsd} · daily ${p.dailyLimitUsd} · {p.allowlistCount} allowed · {new Date(r.createdAt).toLocaleTimeString()}</span></div></div>
          ); })}</div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ARBITRUM — Stylus Deploy Panel (Stylus Contracts tab)
// ---------------------------------------------------------------------------
const STYLUS_CONTRACTS = [
  {
    id: "escrow",
    name: "AgentEscrow.rs",
    desc: "Escrowed service delivery — open / confirm / release / refund, single-claim, no admin key",
    code: `#[entrypoint]
pub fn main(input: Bytes) -> ArbResult {
    let call = EscrowCall::decode(&input)?;
    match call {
        EscrowCall::Open { service, amount } => {
            storage::set_escrow(msg::sender(), service, amount);
            evm::log(EscrowOpened { payer: msg::sender(), amount });
            Ok(b"opened".to_vec())
        }
        EscrowCall::Release { id } => {
            let escrow = storage::get_escrow(id)?;
            require(escrow.confirmed, "not confirmed");
            token::transfer(escrow.provider, escrow.amount)?;
            Ok(b"released".to_vec())
        }
        EscrowCall::Refund { id } => {
            let escrow = storage::get_escrow(id)?;
            require(!escrow.confirmed, "already confirmed");
            token::transfer(escrow.payer, escrow.amount)?;
            Ok(b"refunded".to_vec())
        }
    }
}`,
  },
  {
    id: "registry",
    name: "AgentServiceRegistry.rs",
    desc: "On-chain registry of agent-accessible services — register, query price, deactivate",
    code: `#[entrypoint]
pub fn main(input: Bytes) -> ArbResult {
    let call = RegistryCall::decode(&input)?;
    match call {
        RegistryCall::Register { id, price, uri } => {
            require(storage::get_owner() == msg::sender(), "not owner");
            storage::set_service(id, ServiceRecord { price, uri, active: true });
            evm::log(ServiceRegistered { id, price });
            Ok(id.to_vec())
        }
        RegistryCall::Query { id } => {
            let svc = storage::get_service(id)?;
            Ok(svc.encode())
        }
        RegistryCall::Deactivate { id } => {
            storage::set_active(id, false);
            Ok(b"ok".to_vec())
        }
    }
}`,
  },
] as const;
type StylusDeploy = { id: string; contractId: string; name: string; txHash: string; network: string; ts: string };
export function ArbitrumStylusDeployPanel({ workspace }: { workspace: Workspace }) {
  const { emitReceipt } = useAppState();
  const [deploys, setDeploys] = useLocalStore<StylusDeploy[]>("arb.stylus.deploys", []);
  const [contractIdx, setContractIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const contract = STYLUS_CONTRACTS[contractIdx] ?? STYLUS_CONTRACTS[0]!;
  const deploy = async () => {
    setBusy(true);
    await new Promise((r) => setTimeout(r, 900));
    const txHash = "0x" + hashId("arb", contract.id + Date.now(), 64);
    const d: StylusDeploy = { id: "sdep_" + hashId("arb", txHash, 8), contractId: contract.id, name: contract.name, txHash, network: "Arbitrum Sepolia", ts: new Date().toLocaleTimeString() };
    setDeploys((prev) => [d, ...prev].slice(0, 10));
    emitReceipt({ workspaceId: workspace.id, serviceId: "svc_arb_escrow", serviceName: `Stylus Deploy · ${contract.name}`, amount: 0.02, currency: "USDC", network: workspace.networks[0] ?? "arbitrum-sepolia", kind: "arbitrum.stylus.deploy", payload: { contractId: contract.id, name: contract.name, txHash, network: d.network } });
    setBusy(false);
  };
  return (
    <div className="panel block svc-flavor">
      <div className="block-head">
        <div className="ttl"><span className="sq soft"><Code2 width={15} height={15} /></span><div><h3>Stylus contracts (Rust)</h3><div className="sub">AgentEscrow and ServiceRegistry in Rust/Stylus for Arbitrum · simulate deploy on Sepolia</div></div></div>
        <button className="btn btn-acc btn-sm" type="button" onClick={deploy} disabled={busy}>{busy ? <><Loader2 size={13} className="wallet-spin" /> Deploying…</> : <><Zap width={13} height={13} /> Simulate deploy</>}</button>
      </div>
      <div style={{ display: "flex", gap: 8, padding: "0 16px 10px" }}>
        {STYLUS_CONTRACTS.map((c, i) => (
          <button key={c.id} className={"pill click" + (contractIdx === i ? " on" : "")} type="button" onClick={() => setContractIdx(i)}>{c.name}</button>
        ))}
      </div>
      <div style={{ margin: "0 16px 10px", padding: "2px 0 6px" }}>
        <div style={{ fontSize: ".72rem", color: "var(--muted)", marginBottom: 6 }}>{contract.desc}</div>
        <pre style={{ margin: 0, padding: "10px 14px", borderRadius: 10, background: "var(--bg-2)", border: "1px solid var(--line-2)", fontFamily: "var(--mono)", fontSize: ".72rem", color: "var(--ink)", overflowX: "auto", maxHeight: 220 }}>{contract.code}</pre>
      </div>
      {deploys.length > 0 && (
        <div style={{ padding: "0 16px 14px" }}>
          <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--muted)", padding: "6px 0 8px" }}>Simulated deploys · {deploys.length}</div>
          <div className="svc-table__scroll"><table className="svc-table">
            <thead><tr><th>Contract</th><th>Tx hash</th><th>Network</th><th>Time</th></tr></thead>
            <tbody>{deploys.map((d) => (
              <tr key={d.id}><td style={{ fontWeight: 700 }}>{d.name}</td><td><code style={{ fontSize: ".68rem" }}>{d.txHash.slice(0, 14)}…</code></td><td style={{ fontSize: ".72rem" }}>{d.network}</td><td style={{ fontSize: ".7rem", color: "var(--muted)" }}>{d.ts}</td></tr>
            ))}</tbody>
          </table></div>
        </div>
      )}
    </div>
  );
}
