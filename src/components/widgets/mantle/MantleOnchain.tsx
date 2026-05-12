import { type CSSProperties, useEffect, useState } from "react";
import { Badge, BadgeCheck, Bolt, Check, ExternalLink, Fingerprint, Loader2, PiggyBank, Wallet } from "lucide-react";
import type { Workspace } from "../../../types";
import { useAppState } from "../../../app-state";
import { useWallet } from "../../../wallet";
import { useLocalStore } from "../../../lib/storage";
import { sha256Hex, hashId } from "../../../lib/util-hash";
import {
  isMantleIdentityConfigured, isMantleVaultConfigured, getMantleConfig,
  registerAgentIdentity, resolveAgentId, mantleExplorerTxUrl, mantleExplorerAddrUrl, mantleExplorerTokenUrl,
  vaultDeposit, vaultDeployToYield, vaultRecordDecision,
} from "../../../lib/mantle";
import { ActionPanel } from "../ActionPanel";

const labelStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: 4 };
const headStyle: CSSProperties = { fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 };
const inputStyle: CSSProperties = { padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".84rem" };
const okStrip: CSSProperties = { display: "flex", alignItems: "center", gap: 7, padding: "8px 12px", borderRadius: 10, background: "color-mix(in srgb, var(--green) 12%, transparent)", color: "var(--green)", fontSize: ".74rem", fontWeight: 700, flexWrap: "wrap" };
const code: CSSProperties = { background: "rgba(0,0,0,.16)", padding: "1px 5px", borderRadius: 5, fontSize: ".82em" };

function NotConfigured({ what, env, deployCmd }: { what: string; env: string; deployCmd: string }) {
  return (
    <div className="panel block" style={{ borderStyle: "dashed" }}>
      <div className="block-head"><div className="ttl"><span className="sq soft"><Badge width={15} height={15} /></span><div><h3>{what} — not wired yet</h3><div className="sub">scaffolded, one command from live</div></div></div></div>
      <p style={{ margin: "0 16px 14px", fontSize: ".82rem", color: "var(--muted)", lineHeight: 1.55 }}>
        Deploy the Mantle contracts and set <code style={code}>{env}</code> in <code style={code}>.env.local</code> to enable this on-chain.
        <br />
        <code style={{ ...code, display: "inline-block", marginTop: 6 }}>cd contracts &amp;&amp; {deployCmd}</code>
        <br />
        Until then the rest of the Mantle workspace runs in simulation — nothing breaks.
      </p>
    </div>
  );
}

const SHORT = (h: string) => h.slice(0, 10) + "…" + h.slice(-6);

// ---------------------------------------------------------------------------
// ERC-8004 agent identity NFT on Mantle
// ---------------------------------------------------------------------------
export function MantleAgentIdentity({ workspace }: { workspace: Workspace }) {
  const { emitReceipt, receipts } = useAppState();
  const wallet = useWallet();
  const cfg = getMantleConfig();
  const [domain, setDomain] = useState("yield-researcher.tollgate.run");
  const [agentAddr, setAgentAddr] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [last, setLast] = useState<{ agentId: number | null; txHash: string } | null>(null);
  const [existingId, setExistingId] = useState<number | null>(null);

  useEffect(() => { if (wallet.address && !agentAddr) setAgentAddr(wallet.address); }, [wallet.address, agentAddr]);

  if (!isMantleIdentityConfigured()) {
    return <NotConfigured what="ERC-8004 agent identity (Mantle)" env="VITE_MANTLE_IDENTITY_ADDRESS" deployCmd="npm run deploy:mantle" />;
  }

  const history = receipts.filter((r) => r.workspaceId === workspace.id && r.kind === "mantle.identity.register").slice(0, 8);

  const register = async () => {
    if (busy) return;
    const target = (agentAddr || wallet.address || "").trim();
    if (!domain.trim() || !/^0x[0-9a-fA-F]{40}$/.test(target)) { setErr("Enter a domain and a valid agent address (connect a wallet to autofill)."); return; }
    setBusy(true); setErr(null);
    try {
      const res = await registerAgentIdentity({ domain: domain.trim(), agentAddress: target });
      setLast({ agentId: res.agentId, txHash: res.txHash });
      emitReceipt({
        workspaceId: workspace.id, serviceName: "ERC-8004 · Register agent identity", amount: 0, currency: "MNT",
        network: workspace.networks[0] ?? "mantle", kind: "mantle.identity.register",
        payload: { domain: domain.trim(), agentAddress: target, agentId: res.agentId, txHash: res.txHash, contract: res.contract, chainHex: res.chainHex, explorerUrl: res.explorerUrl },
        status: "verified",
      });
    } catch (e) { setErr((e as { message?: string }).message ?? "Register failed"); }
    finally { setBusy(false); }
  };

  const resolve = async () => {
    const target = (agentAddr || wallet.address || "").trim();
    if (!/^0x[0-9a-fA-F]{40}$/.test(target)) { setErr("Enter a valid address to resolve."); return; }
    setErr(null);
    try { const id = await resolveAgentId(target); setExistingId(id); } catch { setExistingId(null); }
  };

  return (
    <ActionPanel
      icon={<Fingerprint width={15} height={15} />}
      title="ERC-8004 agent identity on Mantle"
      sub={`Every agent gets a unique identity NFT (domain + operational address) in AgentIdentityRegistry on Mantle. Contract ${SHORT(cfg.identityAddress!)}.`}
      actions={
        <button className="btn btn-acc btn-sm" type="button" onClick={register} disabled={busy || !domain.trim()}>
          {busy ? <><Loader2 size={13} className="wallet-spin" /> Registering…</> : <><BadgeCheck width={13} height={13} /> Register identity NFT</>}
        </button>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.4fr", gap: 10, marginBottom: 10 }}>
        <label style={labelStyle}><span style={headStyle}>Agent domain</span>
          <input value={domain} onChange={(e) => setDomain(e.currentTarget.value)} placeholder="my-agent.example" style={inputStyle} />
        </label>
        <label style={labelStyle}><span style={headStyle}>Operational address</span>
          <input value={agentAddr} onChange={(e) => setAgentAddr(e.currentTarget.value)} placeholder={wallet.address ?? "0x…"} style={{ ...inputStyle, fontFamily: "var(--mono)", fontSize: ".78rem" }} />
        </label>
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
        <button className="btn btn-ghost btn-sm" type="button" onClick={resolve}><Wallet width={12} height={12} /> Resolve this address</button>
        {existingId != null && (existingId > 0
          ? <span style={{ fontSize: ".75rem", color: "var(--green)", fontWeight: 700 }}>already registered → agentId #{existingId}</span>
          : <span style={{ fontSize: ".75rem", color: "var(--muted)" }}>not registered yet</span>)}
        <a className="btn btn-ghost btn-sm" href={mantleExplorerAddrUrl(cfg.identityAddress!)} target="_blank" rel="noreferrer">Contract on Mantle Explorer <ExternalLink width={11} height={11} /></a>
      </div>

      {last && (
        <div style={{ ...okStrip, marginBottom: 12 }}>
          <Check width={13} height={13} /> Identity NFT minted{last.agentId != null ? <> · agentId <code style={code}>#{last.agentId}</code></> : null} ·{" "}
          <a href={mantleExplorerTxUrl(last.txHash)} target="_blank" rel="noreferrer" style={{ color: "inherit", display: "inline-flex", alignItems: "center", gap: 4 }}>tx {SHORT(last.txHash)} <ExternalLink width={11} height={11} /></a>
          {last.agentId != null && <a href={mantleExplorerTokenUrl(cfg.identityAddress!, last.agentId)} target="_blank" rel="noreferrer" style={{ color: "inherit", display: "inline-flex", alignItems: "center", gap: 4 }}>· NFT <ExternalLink width={11} height={11} /></a>}
        </div>
      )}
      {err && <div style={{ marginBottom: 12, color: "var(--red)", fontSize: ".76rem", fontWeight: 600 }}>{err}</div>}

      <div style={{ marginTop: 6 }}>
        <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--muted)", padding: "6px 0" }}>Registered identities · {history.length}</div>
        <div className="svc-table__scroll">
          <table className="svc-table">
            <thead><tr><th>Agent id</th><th>Domain</th><th>Address</th><th>Tx</th><th>When</th></tr></thead>
            <tbody>
              {history.length === 0 && <tr><td colSpan={5} style={{ color: "var(--muted)", padding: 14 }}>No identities registered yet — register one above.</td></tr>}
              {history.map((r) => { const p = (r.payload ?? {}) as { agentId?: number; domain?: string; agentAddress?: string; txHash?: string }; return (
                <tr key={r.id}>
                  <td>{p.agentId != null ? <span className="pill ok">#{p.agentId}</span> : "—"}</td>
                  <td>{p.domain ?? "—"}</td>
                  <td><code>{p.agentAddress ? SHORT(p.agentAddress) : "—"}</code></td>
                  <td>{p.txHash ? <a href={mantleExplorerTxUrl(p.txHash)} target="_blank" rel="noreferrer"><code>{p.txHash.slice(0, 10)}…</code></a> : "—"}</td>
                  <td className="muted svc-table__num">{new Date(r.createdAt).toLocaleTimeString()}</td>
                </tr>
              ); })}
            </tbody>
          </table>
        </div>
      </div>
    </ActionPanel>
  );
}

// ---------------------------------------------------------------------------
// AgentVault on Mantle — AI-callable surplus → mETH + on-chain decision log
// ---------------------------------------------------------------------------
type VaultTx = { id: string; kind: "deposit" | "deploy" | "decision"; amount?: string; seq?: number | null; txHash: string; at: string };

export function MantleVaultPanel({ workspace }: { workspace: Workspace }) {
  const { emitReceipt } = useAppState();
  const cfg = getMantleConfig();
  const [depositAmt, setDepositAmt] = useState("0.05");
  const [deployAmt, setDeployAmt] = useState("0.02");
  const [decisionNote, setDecisionNote] = useState("rotate 40% idle → mETH while USDY APY < mETH APY");
  const [busy, setBusy] = useState<"deposit" | "deploy" | "decision" | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [log, setLog] = useLocalStore<VaultTx[]>("mantle.vault.log", []);

  if (!isMantleVaultConfigured()) {
    return <NotConfigured what="AgentVault — deploy surplus → mETH (Mantle)" env="VITE_MANTLE_VAULT_ADDRESS" deployCmd="npm run deploy:mantle" />;
  }

  const push = (t: VaultTx) => setLog((l) => [t, ...l].slice(0, 16));

  const doDeposit = async () => {
    if (busy) return; setBusy("deposit"); setErr(null);
    try {
      const res = await vaultDeposit(depositAmt);
      push({ id: hashId("vd", res.txHash, 6), kind: "deposit", amount: depositAmt, txHash: res.txHash, at: new Date().toISOString() });
      emitReceipt({ workspaceId: workspace.id, serviceName: "AgentVault · Deposit", amount: 0, currency: "MNT", network: workspace.networks[0] ?? "mantle", kind: "mantle.vault.deposit", payload: { amountMnt: depositAmt, txHash: res.txHash, explorerUrl: res.explorerUrl }, status: "verified" });
    } catch (e) { setErr((e as { message?: string }).message ?? "Deposit failed"); } finally { setBusy(null); }
  };

  const doDeploy = async () => {
    if (busy) return; setBusy("deploy"); setErr(null);
    try {
      const strategyRefHex = await sha256Hex(`mantle|deployToYield|${deployAmt}|${decisionNote}`);
      const res = await vaultDeployToYield({ amountEthStr: deployAmt, strategyRefHex });
      push({ id: hashId("vp", res.txHash, 6), kind: "deploy", amount: deployAmt, txHash: res.txHash, at: new Date().toISOString() });
      emitReceipt({ workspaceId: workspace.id, serviceName: "AgentVault · Deploy surplus → mETH (on-chain)", amount: 0, currency: "MNT", network: workspace.networks[0] ?? "mantle", kind: "mantle.vault.deploy", payload: { amountMnt: deployAmt, strategyRef: strategyRefHex, txHash: res.txHash, explorerUrl: res.explorerUrl }, status: "verified" });
    } catch (e) { setErr((e as { message?: string }).message ?? "Deploy failed"); } finally { setBusy(null); }
  };

  const doDecision = async () => {
    if (busy) return; setBusy("decision"); setErr(null);
    try {
      const ctx = JSON.stringify({ ts: Date.now(), surplusMnt: deployAmt, depositMnt: depositAmt });
      const decisionHashHex = await sha256Hex(`decision|${decisionNote}`);
      const contextHashHex = await sha256Hex(ctx);
      const res = await vaultRecordDecision({ decisionHashHex, contextHashHex });
      push({ id: hashId("vx", res.txHash, 6), kind: "decision", seq: res.seq ?? null, txHash: res.txHash, at: new Date().toISOString() });
      emitReceipt({ workspaceId: workspace.id, serviceName: "AgentVault · Record decision (on-chain benchmarking)", amount: 0, currency: "MNT", network: workspace.networks[0] ?? "mantle", kind: "mantle.vault.decision", payload: { note: decisionNote, decisionHash: decisionHashHex, contextHash: contextHashHex, seq: res.seq, txHash: res.txHash, explorerUrl: res.explorerUrl }, status: "verified" });
    } catch (e) { setErr((e as { message?: string }).message ?? "Record failed"); } finally { setBusy(null); }
  };

  const recent = log.slice(0, 8);

  return (
    <ActionPanel
      icon={<PiggyBank width={15} height={15} />}
      title="AgentVault on Mantle · deploy surplus → mETH"
      sub={`An AI-callable vault: the agent parks idle MNT (deposit), calls deployToYield(amount, strategyRef), and anchors every decision on-chain (recordDecision) — that's the on-chain benchmarking trail. Contract ${SHORT(cfg.vaultAddress!)}.`}
      actions={
        <a className="btn btn-ghost btn-sm" href={mantleExplorerAddrUrl(cfg.vaultAddress!)} target="_blank" rel="noreferrer">Vault on Mantle Explorer <ExternalLink width={11} height={11} /></a>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 10 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "10px 12px", borderRadius: 12, background: "var(--field)" }}>
          <span style={headStyle}>1 · Deposit idle MNT</span>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={depositAmt} onChange={(e) => setDepositAmt(e.currentTarget.value)} style={{ ...inputStyle, flex: 1 }} />
            <button className="btn btn-sm" type="button" onClick={doDeposit} disabled={busy !== null}>{busy === "deposit" ? <Loader2 size={12} className="wallet-spin" /> : <Wallet width={12} height={12} />} Deposit</button>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "10px 12px", borderRadius: 12, background: "var(--field)" }}>
          <span style={headStyle}>2 · Deploy to yield (mETH)</span>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={deployAmt} onChange={(e) => setDeployAmt(e.currentTarget.value)} style={{ ...inputStyle, flex: 1 }} />
            <button className="btn btn-acc btn-sm" type="button" onClick={doDeploy} disabled={busy !== null}>{busy === "deploy" ? <Loader2 size={12} className="wallet-spin" /> : <Bolt width={12} height={12} />} Deploy</button>
          </div>
        </div>
      </div>
      <label style={{ ...labelStyle, marginBottom: 10 }}>
        <span style={headStyle}>3 · Decision to anchor on-chain</span>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={decisionNote} onChange={(e) => setDecisionNote(e.currentTarget.value)} style={{ ...inputStyle, flex: 1 }} />
          <button className="btn btn-sm" type="button" onClick={doDecision} disabled={busy !== null || !decisionNote.trim()}>{busy === "decision" ? <Loader2 size={12} className="wallet-spin" /> : <BadgeCheck width={12} height={12} />} Record on Mantle</button>
        </div>
      </label>
      {err && <div style={{ marginBottom: 12, color: "var(--red)", fontSize: ".76rem", fontWeight: 600 }}>{err}</div>}

      <div style={{ marginTop: 6 }}>
        <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--muted)", padding: "6px 0" }}>On-chain vault activity · {log.length}</div>
        <div className="svc-table__scroll">
          <table className="svc-table">
            <thead><tr><th>Action</th><th>Amount / seq</th><th>Tx</th><th>When</th></tr></thead>
            <tbody>
              {recent.length === 0 && <tr><td colSpan={4} style={{ color: "var(--muted)", padding: 14 }}>No vault txs yet — deposit, deploy, or record a decision above.</td></tr>}
              {recent.map((t) => (
                <tr key={t.id}>
                  <td>{t.kind === "deposit" ? <span className="pill">deposit</span> : t.kind === "deploy" ? <span className="pill ok">deploy → mETH</span> : <span className="pill">decision</span>}</td>
                  <td className="svc-table__num">{t.kind === "decision" ? (t.seq != null ? `#${t.seq}` : "—") : `${t.amount} MNT`}</td>
                  <td><a href={mantleExplorerTxUrl(t.txHash)} target="_blank" rel="noreferrer"><code>{t.txHash.slice(0, 10)}…</code></a></td>
                  <td className="muted svc-table__num">{new Date(t.at).toLocaleTimeString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ActionPanel>
  );
}
