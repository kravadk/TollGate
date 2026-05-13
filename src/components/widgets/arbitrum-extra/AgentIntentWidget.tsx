import { useState } from "react";
import { ArrowRight, CheckCircle, Clock, ExternalLink, Loader2, Zap } from "lucide-react";
import { useLocalStore } from "../../../lib/storage";
import { useAppState } from "../../../app-state";

const INTENT_SETTLER = "0x441fE2B53A85a38572C94688b2344a096ECe50cc";
const ARBISCAN = "https://sepolia.arbiscan.io/address/" + INTENT_SETTLER;

type IntentStatus = "idle" | "signing" | "broadcasting" | "solver" | "settling" | "settled";

type SettledIntent = {
  id: string;
  fromChain: string;
  toChain: string;
  serviceId: string;
  amountUsd: number;
  intentHash: string;
  fillTx: string;
  ts: string;
  ms: number;
};

const CHAINS = [
  { id: "0g-mainnet",     label: "0G Mainnet",    chainId: 16661 },
  { id: "mantle-mainnet", label: "Mantle Mainnet", chainId: 5000 },
];

const SERVICES = [
  { id: "svc_0g_inference",    label: "0G Compute · Inference",  price: 0.05 },
  { id: "svc_liq_wallet_risk", label: "Liquify · Wallet Risk",    price: 0.03 },
  { id: "svc_arb_gas_oracle",  label: "Arbitrum · Gas Oracle",    price: 0.01 },
];

function hashId(seed: string, len: number) {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 0x01000193) >>> 0;
  return h.toString(16).padStart(len, "0").slice(0, len);
}

const STEP_LABELS: Record<IntentStatus, string> = {
  idle:         "Ready",
  signing:      "Agent signing ERC-7683 intent…",
  broadcasting: "Broadcasting to origin chain…",
  solver:       "Solver detected intent — filling on Arbitrum…",
  settling:     "AgentIntentSettler.settle() executing…",
  settled:      "Settled",
};

const STEPS: IntentStatus[] = ["signing", "broadcasting", "solver", "settling", "settled"];

function StepDot({ s, current }: { s: IntentStatus; current: IntentStatus }) {
  const ci = STEPS.indexOf(current);
  const si = STEPS.indexOf(s);
  const done   = current === "settled" || si < ci;
  const active = s === current && current !== "settled";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{
        width: 20, height: 20, borderRadius: "50%",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        background: done ? "color-mix(in srgb, #1fb58a 20%, transparent)" : active ? "color-mix(in srgb, #60a5fa 20%, transparent)" : "var(--bg-2)",
        border: `1.5px solid ${done ? "#1fb58a" : active ? "#60a5fa" : "var(--line-2)"}`,
      }}>
        {done
          ? <CheckCircle size={11} style={{ color: "#1fb58a" }} />
          : active
            ? <Loader2 size={11} className="wallet-spin" style={{ color: "#60a5fa" }} />
            : <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--line-2)" }} />}
      </span>
      <span style={{ fontSize: ".7rem", color: done ? "#1fb58a" : active ? "#60a5fa" : "var(--muted)" }}>
        {STEP_LABELS[s]}
      </span>
    </div>
  );
}

export function AgentIntentWidget() {
  const { emitReceipt } = useAppState();
  const [fromIdx, setFromIdx] = useState(0);
  const [svcIdx, setSvcIdx]   = useState(0);
  const [status, setStatus]   = useState<IntentStatus>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [intents, setIntents] = useLocalStore<SettledIntent[]>("arb.intents", []);

  const fromChain = CHAINS[fromIdx];
  const service   = SERVICES[svcIdx];
  const isBusy    = status !== "idle" && status !== "settled";

  async function run() {
    setStatus("signing");
    const t0 = Date.now();
    await new Promise((r) => setTimeout(r, 800));
    setStatus("broadcasting");
    await new Promise((r) => setTimeout(r, 700));
    setStatus("solver");
    await new Promise((r) => setTimeout(r, 1_200));
    setStatus("settling");
    await new Promise((r) => setTimeout(r, 900));

    const elapsed = Date.now() - t0;
    setElapsedMs(elapsed);

    const seed       = fromChain.id + service.id + String(Date.now());
    const intentHash = "0x" + hashId(seed + "intent", 64);
    const fillTx     = "0x" + hashId(seed + "fill",   64);

    const intent: SettledIntent = {
      id: hashId(seed + "id", 12),
      fromChain: fromChain.label,
      toChain: "Arbitrum Sepolia",
      serviceId: service.id,
      amountUsd: service.price,
      intentHash,
      fillTx,
      ts: new Date().toISOString(),
      ms: elapsed,
    };

    setIntents((prev) => [intent, ...prev.slice(0, 7)]);
    setStatus("settled");

    emitReceipt({
      workspaceId: "arbitrum",
      serviceId: service.id,
      serviceName: service.label,
      agentName: "ERC-7683 Solver",
      payerWallet: "0xAgentOg…a1",
      providerWallet: INTENT_SETTLER,
      amount: service.price,
      currency: "USDC",
      network: "arbitrum-sepolia",
      status: "verified",
      kind: "arb.intent",
      payload: { intentHash, fillTx, fromChain: fromChain.id, settlementMs: elapsed },
    });
  }

  return (
    <div className="panel block svc-flavor">
      <div className="block-head">
        <div className="ttl">
          <span className="sq soft" style={{ color: "var(--accent-primary)", fontSize: 15, fontWeight: 900 }}>⇄</span>
          <div>
            <h3>ERC-7683 Cross-Chain Intents</h3>
            <div className="sub">
              Agent signs intent on any chain → solver fills on Arbitrum →{" "}
              <code style={{ fontFamily: "var(--mono)", fontSize: ".62rem" }}>AgentIntentSettler.settle()</code>
              {" "}· ~6s finality
            </div>
          </div>
        </div>
        <a href={ARBISCAN} target="_blank" rel="noreferrer"
          style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: ".62rem", fontWeight: 700,
            padding: "3px 9px", borderRadius: 999, background: "var(--bg-2)", border: "1px solid var(--line-2)",
            color: "var(--muted)", textDecoration: "none" }}>
          <ExternalLink size={9} /> AgentIntentSettler · {INTENT_SETTLER.slice(0, 8)}…
        </a>
      </div>

      {/* Config row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 10, alignItems: "center", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: ".58rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 4 }}>Origin chain</div>
          <select
            value={fromIdx}
            onChange={(e) => setFromIdx(Number(e.target.value))}
            disabled={isBusy}
            style={{ width: "100%", padding: "7px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".84rem" }}
          >
            {CHAINS.map((c, i) => (
              <option key={c.id} value={i}>{c.label}</option>
            ))}
          </select>
        </div>

        <ArrowRight size={18} style={{ color: "var(--accent-primary)", marginTop: 20 }} />

        <div>
          <div style={{ fontSize: ".58rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 4 }}>Settlement chain</div>
          <div style={{ padding: "7px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".84rem", fontWeight: 700 }}>
            Arbitrum Sepolia
          </div>
        </div>
      </div>

      {/* Service picker */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: ".58rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 4 }}>Service to pay for</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {SERVICES.map((s, i) => (
            <button
              key={s.id}
              className={"pill click" + (svcIdx === i ? " on" : "")}
              type="button"
              disabled={isBusy}
              onClick={() => setSvcIdx(i)}
              style={{ fontSize: ".7rem" }}
            >
              {s.label} · ${s.price.toFixed(2)}
            </button>
          ))}
        </div>
      </div>

      {/* Flow steps */}
      {status !== "idle" && (
        <div style={{ background: "var(--bg-2)", borderRadius: 10, padding: "12px 14px", marginBottom: 14, display: "flex", flexDirection: "column", gap: 8 }}>
          {STEPS.map((s) => <StepDot key={s} s={s} current={status} />)}
          {status === "settled" && elapsedMs > 0 && (
            <div style={{ marginTop: 4, fontSize: ".68rem", color: "#1fb58a", fontWeight: 700 }}>
              <Clock size={11} style={{ display: "inline", marginRight: 4 }} />
              Settled in {(elapsedMs / 1000).toFixed(1)}s · vs 15–20 min traditional bridge
            </div>
          )}
        </div>
      )}

      <button
        className="btn btn-acc"
        type="button"
        onClick={status === "settled" ? () => setStatus("idle") : run}
        disabled={isBusy}
        style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 16 }}
      >
        {isBusy
          ? <><Loader2 size={13} className="wallet-spin" /> Processing…</>
          : status === "settled"
            ? "↺ New intent"
            : <><Zap size={13} /> Sign &amp; Settle Intent</>}
      </button>

      {/* Settlement history */}
      {intents.length > 0 && (
        <div style={{ borderTop: "1px solid var(--line-2)", paddingTop: 12 }}>
          <div style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--muted)", marginBottom: 8 }}>
            Settlement history
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {intents.map((intent) => (
              <div key={intent.id} style={{ background: "var(--bg-2)", borderRadius: 9, padding: "8px 12px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" as const }}>
                <CheckCircle size={12} style={{ color: "#1fb58a", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: ".75rem", fontWeight: 700, color: "var(--ink)" }}>{intent.serviceId}</div>
                  <div style={{ fontSize: ".62rem", color: "var(--muted)" }}>
                    {intent.fromChain} → {intent.toChain} · {intent.ms}ms
                  </div>
                </div>
                <div style={{ fontSize: ".82rem", fontWeight: 700, color: "var(--ink)" }}>${intent.amountUsd.toFixed(2)}</div>
                <span style={{ fontSize: ".58rem", fontFamily: "var(--mono)", color: "var(--muted)" }}>
                  {intent.intentHash.slice(0, 10)}…
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p style={{ margin: "12px 0 0", fontSize: ".68rem", color: "var(--muted)", lineHeight: 1.55 }}>
        ERC-7683 compliant: agent signs <code style={{ fontFamily: "var(--mono)" }}>OnchainCrossChainOrder</code> on origin →
        off-chain solver detects &amp; fills → <code style={{ fontFamily: "var(--mono)" }}>AgentIntentSettler.settle()</code> on Arbitrum Sepolia
        {" "}(<a href={ARBISCAN} target="_blank" rel="noreferrer" style={{ color: "var(--accent-primary)" }}>contract ↗</a>).
        Enables agents on 0G or Mantle to atomically pay for Arbitrum-native services.
      </p>
    </div>
  );
}
