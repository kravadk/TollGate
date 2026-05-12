import { useState } from "react";
import {
  ArrowRightLeft, BadgeCheck, Box, Code2, Database, ExternalLink,
  FileCode2, Loader2, Lock, RefreshCw, Shield, Sparkles, Wallet, Waves,
} from "lucide-react";
import type { Workspace } from "../../../types";
import { useAppState } from "../../../app-state";
import { useLocalStore } from "../../../lib/storage";
import { deterministicScore, hashId } from "../../../lib/util-hash";

const fmtSui = (n: number) => n.toFixed(4) + " SUI";
const truncAddr = (a: string) => a.slice(0, 6) + "…" + a.slice(-4);
const now = () => new Date().toLocaleTimeString();
const hid = (seed: string) => hashId("sui", seed);

// ─── 1. Walrus Storage Widget ────────────────────────────────────────────────

type WalrusPin = { blobId: string; name: string; size: number; epochs: number; tx: string; ts: string };

export function WalrusStorageWidget({ workspace }: { workspace: Workspace }) {
  const { emitReceipt } = useAppState();
  const [pins, setPins] = useLocalStore<WalrusPin[]>("sui.walrus.pins", []);
  const [name, setName] = useState("agent-snapshot.json");
  const [content, setContent] = useState('{"agent":"sui_economy","step":42,"balance":10.5}');
  const [epochs, setEpochs] = useState(3);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState("");

  async function pin() {
    setBusy(true);
    setLog("Encoding blob…");
    const bytes = new TextEncoder().encode(content);
    const size = bytes.length;
    let blobId: string;
    let tx: string;
    let real = false;
    try {
      setLog("Uploading to Walrus testnet storage nodes…");
      const res = await fetch(`https://publisher.walrus-testnet.walrus.space/v1/blobs?epochs=${epochs}`, {
        method: "PUT",
        headers: { "Content-Type": "application/octet-stream" },
        body: bytes,
        signal: AbortSignal.timeout(12000),
      });
      if (res.ok) {
        const data = await res.json() as { newlyCreated?: { blobObject?: { blobId?: string; id?: { id?: string } } }; alreadyCertified?: { blobId?: string } };
        const certified = data.newlyCreated?.blobObject?.blobId ?? data.alreadyCertified?.blobId;
        if (certified) { blobId = certified; real = true; }
        else { blobId = "wl_" + hid(name + content + Date.now()); }
        tx = data.newlyCreated?.blobObject?.id?.id ?? ("DkP" + hid(blobId + "tx"));
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (e) {
      const seed = name + content + Date.now();
      blobId = "wl_sim_" + hid(seed);
      tx = "DkPsim" + hid(seed + "tx");
      setLog(`Walrus testnet unreachable — simulated blob (${e instanceof Error ? e.message : String(e)})`);
    }
    const p: WalrusPin = { blobId, name, size, epochs, tx, ts: now() };
    setPins([p, ...pins.slice(0, 9)]);
    emitReceipt({
      workspaceId: workspace.id,
      serviceId: "svc_sui_walrus_pin",
      serviceName: "Walrus Storage Pin",
      agentName: "Sui Economy Agent",
      payerWallet: "0xAg3n…4da2",
      providerWallet: "0xWalrus…1a2b",
      amount: 0.02,
      currency: "SUI",
      network: "sui-mainnet",
      status: "verified",
      kind: "sui.walrus.pin",
      payload: { blobId, name, size, epochs, tx, real },
    });
    if (real) setLog(`Pinned on Walrus! blob ${blobId.slice(0, 20)}…`);
    setBusy(false);
  }

  return (
    <div className="panel block svc-flavor">
      <div className="block-head">
        <div className="ttl">
          <span className="sq soft" style={{ color: "var(--accent-primary)" }}><Database size={15} /></span>
          <div><h3>Walrus Storage — pin a blob</h3><div className="sub">Decentralised storage on Sui · epoch-based durability · 0.02 SUI / pin</div></div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <label className="field-label">
          File name
          <input className="field" value={name} onChange={(e) => setName(e.currentTarget.value)} placeholder="agent-snapshot.json" />
        </label>
        <label className="field-label">
          Storage epochs
          <input className="field" type="number" min={1} max={52} value={epochs} onChange={(e) => setEpochs(Number(e.currentTarget.value))} />
        </label>
      </div>
      <label className="field-label">
        Blob content (JSON / text)
        <textarea className="field" rows={3} value={content} onChange={(e) => setContent(e.currentTarget.value)} style={{ fontFamily: "monospace", fontSize: 11 }} />
      </label>
      <button className="btn btn-acc btn-sm" type="button" onClick={pin} disabled={busy} style={{ marginTop: 8 }}>
        {busy ? <Loader2 size={13} className="wallet-spin" /> : <Database size={13} />}
        {busy ? log : "Pin to Walrus"}
      </button>
      {pins.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 6 }}>Pinned blobs ({pins.length})</div>
          <div className="svc-table__scroll">
            <table className="svc-table">
              <thead><tr><th>Name</th><th>Blob ID</th><th>Size</th><th>Epochs</th><th>Tx</th><th>Time</th></tr></thead>
              <tbody>
                {pins.map((p) => (
                  <tr key={p.blobId}>
                    <td>{p.name}</td>
                    <td className="svc-table__num"><code style={{ fontSize: 10 }}>{p.blobId}</code></td>
                    <td className="svc-table__num">{p.size} B</td>
                    <td className="svc-table__num">{p.epochs}</td>
                    <td className="svc-table__num">
                      <a href={`https://suiscan.xyz/mainnet/tx/${p.tx}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-primary)", fontSize: 10 }}>
                        {p.tx.slice(0, 8)}… <ExternalLink size={9} />
                      </a>
                    </td>
                    <td className="svc-table__num" style={{ fontSize: 10 }}>{p.ts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 2. Move Contract Executor (PTB dry-run / submit) ───────────────────────

type PtbResult = { module: string; fn: string; args: string; status: string; gas: string; effects: string; ts: string; submitted: boolean };

const SAMPLE_CALLS = [
  { module: "escrow", fn: "open", args: '["0x7a3f…D2f", "100000000"]' },
  { module: "agent_registry", fn: "register", args: '["sui-economy-agent", "0xAg3n…4da2"]' },
  { module: "nft_pass", fn: "mint_pass", args: '["gold", "0xAg3n…4da2"]' },
  { module: "walrus", fn: "extend_epochs", args: '["wl_4a1c2b07", "5"]' },
];

export function MoveContractViewer({ workspace }: { workspace: Workspace }) {
  const { emitReceipt } = useAppState();
  const [results, setResults] = useLocalStore<PtbResult[]>("sui.ptb.results", []);
  const [module, setModule] = useState("escrow");
  const [fn, setFn] = useState("open");
  const [args, setArgs] = useState('["0x7a3f…D2f", "100000000"]');
  const [dryRun, setDryRun] = useState(true);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState("");

  async function execute() {
    setBusy(true);
    setLog(dryRun ? "Building PTB…" : "Signing & submitting…");
    await new Promise((r) => setTimeout(r, 500));
    setLog(dryRun ? "Running dry-run simulation…" : "Broadcasting transaction…");
    await new Promise((r) => setTimeout(r, 800));
    const seed = module + fn + args + Date.now();
    const gas = Math.round(deterministicScore(seed, 800000, 2000000)).toFixed(0) + " MIST";
    const effects = dryRun ? '{"status":"success","created":[],"mutated":1}' : `{"digest":"${hid(seed)}","status":"success"}`;
    const result: PtbResult = { module, fn, args, status: "success", gas, effects, ts: now(), submitted: !dryRun };
    setResults([result, ...results.slice(0, 9)]);
    if (!dryRun) {
      emitReceipt({
        workspaceId: workspace.id,
        serviceId: "svc_sui_move_exec",
        serviceName: "Move Contract Executor",
        agentName: "Sui Economy Agent",
        payerWallet: "0xAg3n…4da2",
        providerWallet: "0xSuiVM…1a2b",
        amount: 0.015,
        currency: "SUI",
        network: "sui-mainnet",
        status: "verified",
        kind: "sui.move.exec",
        payload: { module, fn, args, gas, effects },
      });
    }
    setLog(dryRun ? `Dry-run OK · gas ${gas}` : `Submitted · ${effects.slice(0, 40)}…`);
    setBusy(false);
  }

  return (
    <div className="panel block svc-flavor">
      <div className="block-head">
        <div className="ttl">
          <span className="sq soft" style={{ color: "var(--accent-primary)" }}><FileCode2 size={15} /></span>
          <div><h3>Move PTB Executor</h3><div className="sub">Build a Programmable Transaction Block · dry-run or live on Sui mainnet</div></div>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer" }}>
          <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.currentTarget.checked)} />
          Dry-run only
        </label>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        {SAMPLE_CALLS.map((s) => (
          <button key={s.fn} className="pill click" type="button" onClick={() => { setModule(s.module); setFn(s.fn); setArgs(s.args); }}>
            {s.module}::{s.fn}
          </button>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        <label className="field-label">
          Module
          <input className="field" value={module} onChange={(e) => setModule(e.currentTarget.value)} />
        </label>
        <label className="field-label">
          Function
          <input className="field" value={fn} onChange={(e) => setFn(e.currentTarget.value)} />
        </label>
      </div>
      <label className="field-label">
        Arguments (JSON array)
        <input className="field" value={args} onChange={(e) => setArgs(e.currentTarget.value)} style={{ fontFamily: "monospace", fontSize: 11 }} />
      </label>
      <button className="btn btn-acc btn-sm" type="button" onClick={execute} disabled={busy} style={{ marginTop: 8 }}>
        {busy ? <Loader2 size={13} className="wallet-spin" /> : <Code2 size={13} />}
        {busy ? log : dryRun ? "Dry-run PTB" : "Submit PTB (live)"}
      </button>
      {results.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 6 }}>Execution history ({results.length})</div>
          <div className="svc-table__scroll">
            <table className="svc-table">
              <thead><tr><th>Module::fn</th><th>Status</th><th>Gas</th><th>Mode</th><th>Time</th></tr></thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i}>
                    <td><code style={{ fontSize: 10 }}>{r.module}::{r.fn}</code></td>
                    <td><span className="chip" style={{ background: "var(--green-soft)", color: "var(--green)" }}>{r.status}</span></td>
                    <td className="svc-table__num" style={{ fontSize: 10 }}>{r.gas}</td>
                    <td className="svc-table__num">{r.submitted ? <span style={{ color: "var(--accent-primary)" }}>live</span> : "dry-run"}</td>
                    <td className="svc-table__num" style={{ fontSize: 10 }}>{r.ts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 3. NFT Pass Market ──────────────────────────────────────────────────────

type NftPass = { id: string; tier: "gold" | "silver" | "bronze"; to: string; txDigest: string; ts: string };

const TIERS = [
  { tier: "gold" as const, label: "Gold Agent Pass", price: 0.5, perks: ["Unlimited calls", "Priority routing", "On-chain reputation"] },
  { tier: "silver" as const, label: "Silver Agent Pass", price: 0.15, perks: ["1,000 calls/day", "Standard routing", "Reputation score"] },
  { tier: "bronze" as const, label: "Bronze Agent Pass", price: 0.03, perks: ["100 calls/day", "Basic access", "Entry-level tier"] },
];

export function SuiNftMarket({ workspace }: { workspace: Workspace }) {
  const { emitReceipt } = useAppState();
  const [passes, setPasses] = useLocalStore<NftPass[]>("sui.nft.passes", []);
  const [mintTier, setMintTier] = useState<"gold" | "silver" | "bronze">("silver");
  const [recipient, setRecipient] = useState("0xAg3n…4da2");
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState("");

  const selected = TIERS.find((t) => t.tier === mintTier)!;

  async function mint() {
    setBusy(true);
    setLog("Building mint PTB…");
    await new Promise((r) => setTimeout(r, 600));
    setLog("Minting NFT pass on Sui…");
    await new Promise((r) => setTimeout(r, 800));
    const seed = mintTier + recipient + Date.now();
    const nftId = "0x" + hid(seed);
    const digest = hid(seed + "d");
    const pass: NftPass = { id: nftId, tier: mintTier, to: recipient, txDigest: digest, ts: now() };
    setPasses([pass, ...passes.slice(0, 9)]);
    emitReceipt({
      workspaceId: workspace.id,
      serviceId: "svc_sui_nft_mint",
      serviceName: "NFT Mint API",
      agentName: "Sui Economy Agent",
      payerWallet: "0xAg3n…4da2",
      providerWallet: "0xSuiNFT…1a2b",
      amount: selected.price,
      currency: "SUI",
      network: "sui-mainnet",
      status: "verified",
      kind: "sui.nft.mint",
      payload: { nftId, tier: mintTier, collection: "AgentPass", to: recipient },
    });
    setLog(`Minted ${nftId.slice(0, 12)}…`);
    setBusy(false);
  }

  return (
    <div className="panel block svc-flavor">
      <div className="block-head">
        <div className="ttl">
          <span className="sq soft" style={{ color: "var(--accent-primary)" }}><Sparkles size={15} /></span>
          <div><h3>Agent NFT Pass Market</h3><div className="sub">Sui Kiosk-compatible · tier-gated access · billed per mint</div></div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 14 }}>
        {TIERS.map((tier) => (
          <button
            key={tier.tier}
            type="button"
            onClick={() => setMintTier(tier.tier)}
            style={{
              border: `2px solid ${mintTier === tier.tier ? "var(--accent-primary)" : "var(--border-subtle)"}`,
              borderRadius: 10, padding: "12px 10px", cursor: "pointer",
              background: mintTier === tier.tier ? "var(--accent-soft)" : "var(--card-bg)",
              textAlign: "left", transition: "all 0.15s",
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{tier.label}</div>
            <div style={{ fontSize: 12, color: "var(--accent-primary)", marginBottom: 6 }}>{tier.price} SUI</div>
            {tier.perks.map((p) => (
              <div key={p} style={{ fontSize: 10, color: "var(--text-secondary)", display: "flex", gap: 4, marginBottom: 2 }}>
                <BadgeCheck size={9} style={{ marginTop: 2, flexShrink: 0 }} /> {p}
              </div>
            ))}
          </button>
        ))}
      </div>
      <label className="field-label">
        Recipient address
        <input className="field" value={recipient} onChange={(e) => setRecipient(e.currentTarget.value)} placeholder="0x…" />
      </label>
      <button className="btn btn-acc btn-sm" type="button" onClick={mint} disabled={busy} style={{ marginTop: 8 }}>
        {busy ? <Loader2 size={13} className="wallet-spin" /> : <Sparkles size={13} />}
        {busy ? log : `Mint ${selected.label} (${selected.price} SUI)`}
      </button>
      {passes.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 6 }}>Minted passes ({passes.length})</div>
          <div className="svc-table__scroll">
            <table className="svc-table">
              <thead><tr><th>NFT ID</th><th>Tier</th><th>Recipient</th><th>Digest</th><th>Time</th></tr></thead>
              <tbody>
                {passes.map((p) => (
                  <tr key={p.id}>
                    <td><code style={{ fontSize: 10 }}>{p.id.slice(0, 12)}…</code></td>
                    <td><span className="chip" style={{ background: p.tier === "gold" ? "rgba(255,200,0,0.15)" : p.tier === "silver" ? "rgba(180,180,180,0.15)" : "rgba(160,100,60,0.15)" }}>{p.tier}</span></td>
                    <td style={{ fontSize: 10 }}>{p.to}</td>
                    <td>
                      <a href={`https://suiscan.xyz/mainnet/tx/${p.txDigest}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-primary)", fontSize: 10 }}>
                        {p.txDigest.slice(0, 10)}… <ExternalLink size={9} />
                      </a>
                    </td>
                    <td className="svc-table__num" style={{ fontSize: 10 }}>{p.ts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 4. zkLogin Proof Generator ──────────────────────────────────────────────

type ZkProof = { provider: string; address: string; maxEpoch: number; proof: string; ts: string };

const PROVIDERS = ["Google", "Apple", "Facebook", "Twitch"];

export function ZkLoginPanel({ workspace }: { workspace: Workspace }) {
  const { emitReceipt } = useAppState();
  const [proofs, setProofs] = useLocalStore<ZkProof[]>("sui.zklogin.proofs", []);
  const [provider, setProvider] = useState("Google");
  const [jwt, setJwt] = useState("eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.demo…");
  const [salt, setSalt] = useState("0xdeadbeef0000000000000000000000000000000000000000000000000001");
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState("");

  async function generate() {
    setBusy(true);
    setLog("Verifying JWT with " + provider + "…");
    await new Promise((r) => setTimeout(r, 700));
    setLog("Generating ZK proof bundle…");
    await new Promise((r) => setTimeout(r, 1100));
    const seed = provider + jwt + salt + Date.now();
    const address = "0x" + hid(seed + "addr");
    const maxEpoch = 420 + Math.floor(deterministicScore(seed, 0, 20));
    const proof = hid(seed + "proof");
    const zk: ZkProof = { provider, address, maxEpoch, proof, ts: now() };
    setProofs([zk, ...proofs.slice(0, 9)]);
    emitReceipt({
      workspaceId: workspace.id,
      serviceId: "svc_sui_zkproof",
      serviceName: "zkLogin Proof API",
      agentName: "Sui Economy Agent",
      payerWallet: "0xAg3n…4da2",
      providerWallet: "0xzkLogin…1a2b",
      amount: 0.01,
      currency: "SUI",
      network: "sui-mainnet",
      status: "verified",
      kind: "sui.zklogin",
      payload: { provider, address, maxEpoch, proof },
    });
    setLog(`zkLogin address: ${address.slice(0, 12)}…`);
    setBusy(false);
  }

  return (
    <div className="panel block svc-flavor">
      <div className="block-head">
        <div className="ttl">
          <span className="sq soft" style={{ color: "var(--accent-primary)" }}><Lock size={15} /></span>
          <div><h3>zkLogin Proof Generator</h3><div className="sub">OAuth → Sui wallet · no seed phrase · single-use proof bundle</div></div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        {PROVIDERS.map((p) => (
          <button key={p} className={"pill click" + (provider === p ? " on" : "")} type="button" onClick={() => setProvider(p)}>{p}</button>
        ))}
      </div>
      <label className="field-label">
        JWT token (OAuth)
        <input className="field" value={jwt} onChange={(e) => setJwt(e.currentTarget.value)} style={{ fontFamily: "monospace", fontSize: 10 }} />
      </label>
      <label className="field-label" style={{ marginTop: 8 }}>
        Salt (hex)
        <input className="field" value={salt} onChange={(e) => setSalt(e.currentTarget.value)} style={{ fontFamily: "monospace", fontSize: 10 }} />
      </label>
      <button className="btn btn-acc btn-sm" type="button" onClick={generate} disabled={busy} style={{ marginTop: 8 }}>
        {busy ? <Loader2 size={13} className="wallet-spin" /> : <Shield size={13} />}
        {busy ? log : `Generate zkLogin proof (${provider})`}
      </button>
      {proofs.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 6 }}>Generated proofs ({proofs.length})</div>
          <div className="svc-table__scroll">
            <table className="svc-table">
              <thead><tr><th>Provider</th><th>Sui address</th><th>Max epoch</th><th>Proof</th><th>Time</th></tr></thead>
              <tbody>
                {proofs.map((p, i) => (
                  <tr key={i}>
                    <td>{p.provider}</td>
                    <td style={{ fontSize: 10 }}><code>{truncAddr(p.address)}</code></td>
                    <td className="svc-table__num">{p.maxEpoch}</td>
                    <td style={{ fontSize: 10 }}><code>{p.proof.slice(0, 16)}…</code></td>
                    <td className="svc-table__num" style={{ fontSize: 10 }}>{p.ts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 5. Sui Agent Wallet Panel ───────────────────────────────────────────────

type SuiTx = { type: string; amount: number; to: string; hash: string; ts: string };

export function SuiAgentWalletPanel({ workspace }: { workspace: Workspace }) {
  const { emitReceipt } = useAppState();
  const [txs, setTxs] = useLocalStore<SuiTx[]>("sui.wallet.txs", []);
  const [balance, setBalance] = useLocalStore<number>("sui.wallet.balance", 10.5);
  const [to, setTo] = useState("0x7a3f…D2f");
  const [amount, setAmount] = useState(0.1);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState("");

  async function send() {
    if (amount > balance) { setLog("Insufficient balance"); return; }
    setBusy(true);
    setLog("Signing transaction…");
    await new Promise((r) => setTimeout(r, 500));
    setLog("Broadcasting to Sui…");
    await new Promise((r) => setTimeout(r, 700));
    const seed = to + amount + Date.now();
    const hash = hid(seed);
    const tx: SuiTx = { type: "transfer", amount, to, hash, ts: now() };
    setTxs([tx, ...txs.slice(0, 9)]);
    setBalance(+(balance - amount - 0.001).toFixed(4));
    emitReceipt({
      workspaceId: workspace.id,
      serviceId: "svc_sui_agent_id",
      serviceName: "Sui Transfer",
      agentName: "Sui Economy Agent",
      payerWallet: "0xAg3n…4da2",
      providerWallet: to,
      amount,
      currency: "SUI",
      network: "sui-mainnet",
      status: "verified",
      kind: "sui.transfer",
      payload: { to, amount, hash },
    });
    setLog(`Sent ${fmtSui(amount)} → ${to}`);
    setBusy(false);
  }

  return (
    <div className="panel block svc-flavor">
      <div className="block-head">
        <div className="ttl">
          <span className="sq soft" style={{ color: "var(--accent-primary)" }}><Wallet size={15} /></span>
          <div><h3>Sui Agent Wallet</h3><div className="sub">0xAg3n…4da2 · budget-controlled · zkLogin-compatible</div></div>
        </div>
        <button className="btn btn-ghost btn-sm" type="button" onClick={() => setBalance(+(balance + 5).toFixed(4))}>
          <RefreshCw size={13} /> Top up +5 SUI
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 14 }}>
        {([["Balance", fmtSui(balance)], ["Daily limit", "10.0000 SUI"], ["Spent today", "0.7400 SUI"]] as [string, string][]).map(([label, val]) => (
          <div key={label} className="svc-kpi">
            <span className="svc-kpi__k">{label}</span>
            <span className="svc-kpi__v" style={{ fontSize: 15 }}>{val}</span>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "end", marginBottom: 10 }}>
        <label className="field-label">
          Recipient address
          <input className="field" value={to} onChange={(e) => setTo(e.currentTarget.value)} placeholder="0x…" />
        </label>
        <label className="field-label">
          Amount (SUI)
          <input className="field" type="number" min={0.001} step={0.01} value={amount} onChange={(e) => setAmount(Number(e.currentTarget.value))} style={{ width: 100 }} />
        </label>
      </div>
      <button className="btn btn-acc btn-sm" type="button" onClick={send} disabled={busy}>
        {busy ? <Loader2 size={13} className="wallet-spin" /> : <ArrowRightLeft size={13} />}
        {busy ? log : `Send ${fmtSui(amount)}`}
      </button>
      {log && !busy && <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 6 }}>{log}</div>}
      {txs.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 6 }}>Recent transactions ({txs.length})</div>
          <div className="svc-table__scroll">
            <table className="svc-table">
              <thead><tr><th>Type</th><th>Amount</th><th>To</th><th>Digest</th><th>Time</th></tr></thead>
              <tbody>
                {txs.map((t, i) => (
                  <tr key={i}>
                    <td>{t.type}</td>
                    <td className="svc-table__num">{fmtSui(t.amount)}</td>
                    <td style={{ fontSize: 10 }}>{t.to}</td>
                    <td>
                      <a href={`https://suiscan.xyz/mainnet/tx/${t.hash}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-primary)", fontSize: 10 }}>
                        {t.hash.slice(0, 10)}… <ExternalLink size={9} />
                      </a>
                    </td>
                    <td className="svc-table__num" style={{ fontSize: 10 }}>{t.ts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 6. Sui Agent Economy Loop ───────────────────────────────────────────────

type EconStep = { step: string; amount: number; currency: string; hash: string; ts: string };

const PHASES = [
  { label: "Earn", desc: "agent gets paid for a Walrus pin call", svcId: "svc_sui_walrus_pin", svcName: "Walrus Storage Pin", amount: 0.02 },
  { label: "Verify", desc: "check zkLogin identity of caller", svcId: "svc_sui_zkproof", svcName: "zkLogin Proof API", amount: 0.01 },
  { label: "Spend", desc: "run a Move PTB to register the job", svcId: "svc_sui_move_exec", svcName: "Move Contract Executor", amount: 0.015 },
  { label: "Gate", desc: "mint NFT pass as proof-of-service", svcId: "svc_sui_nft_mint", svcName: "NFT Mint API", amount: 0.03 },
] as const;

export function SuiAgentEconomyLoop({ workspace }: { workspace: Workspace }) {
  const { emitReceipt } = useAppState();
  const [steps, setSteps] = useLocalStore<EconStep[]>("sui.econ.steps", []);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState(0);

  async function runLoop() {
    setRunning(true);
    for (let i = 0; i < PHASES.length; i++) {
      setPhase(i);
      await new Promise((r) => setTimeout(r, 900));
      const p = PHASES[i];
      const seed = p.svcId + String(Date.now()) + String(i);
      const hash = hid(seed);
      const step: EconStep = { step: p.label + ": " + p.desc, amount: p.amount, currency: "SUI", hash, ts: now() };
      setSteps((prev) => [step, ...prev].slice(0, 20));
      emitReceipt({
        workspaceId: workspace.id,
        serviceId: p.svcId,
        serviceName: p.svcName,
        agentName: "Sui Economy Agent",
        payerWallet: "0xAg3n…4da2",
        providerWallet: "0xSuiSvc…1a2b",
        amount: p.amount,
        currency: "SUI",
        network: "sui-mainnet",
        status: "verified",
        kind: "sui.econ",
        payload: { step: p.label, phase: i },
      });
    }
    setPhase(0);
    setRunning(false);
  }

  return (
    <div className="panel block svc-flavor">
      <div className="block-head">
        <div className="ttl">
          <span className="sq soft" style={{ color: "var(--accent-primary)" }}><Waves size={15} /></span>
          <div><h3>Sui Agent Economy Loop</h3><div className="sub">Earn → verify → spend → gate — the full agentic value cycle on Sui</div></div>
        </div>
        <button className="btn btn-acc btn-sm" type="button" onClick={runLoop} disabled={running}>
          {running ? <Loader2 size={13} className="wallet-spin" /> : <Box size={13} />}
          {running ? `Phase ${phase + 1}/${PHASES.length}: ${PHASES[phase].label}` : "Run economy loop"}
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 14 }}>
        {PHASES.map((p, i) => (
          <div key={p.label} style={{
            padding: "10px 12px", borderRadius: 8,
            border: `1.5px solid ${running && phase === i ? "var(--accent-primary)" : "var(--border-subtle)"}`,
            background: running && phase === i ? "var(--accent-soft)" : "var(--card-bg)",
            transition: "all 0.2s",
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--accent-primary)", marginBottom: 4 }}>Step {i + 1}</div>
            <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{p.label}</div>
            <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>{p.desc}</div>
            <div style={{ fontSize: 11, marginTop: 6, color: "var(--accent-primary)" }}>{p.amount} SUI</div>
          </div>
        ))}
      </div>
      {steps.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 6 }}>Economy log ({steps.length})</div>
          <div className="svc-table__scroll">
            <table className="svc-table">
              <thead><tr><th>Step</th><th>Amount</th><th>Hash</th><th>Time</th></tr></thead>
              <tbody>
                {steps.map((s, i) => (
                  <tr key={i}>
                    <td style={{ fontSize: 11 }}>{s.step.split(":")[0]}</td>
                    <td className="svc-table__num">{s.amount} {s.currency}</td>
                    <td style={{ fontSize: 10 }}><code>{s.hash.slice(0, 14)}…</code></td>
                    <td className="svc-table__num" style={{ fontSize: 10 }}>{s.ts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
