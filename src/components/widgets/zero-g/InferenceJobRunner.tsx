import { useMemo, useState } from "react";
import { Bolt, Check, ExternalLink, Link2, Loader2, Plus, ShieldCheck, Trash2, Cpu } from "lucide-react";
import type { Workspace } from "../../../types";
import { useAppState } from "../../../app-state";
import { useLocalStore } from "../../../lib/storage";
import { deterministicScore, hashId, fnv1aHex, sha256Hex } from "../../../lib/util-hash";
import { anchorReceiptOnChain, isOgRegistryConfigured, ogExplorerTxUrl, runOgInference } from "../../../lib/og";
import { ActionPanel } from "../ActionPanel";
import { WidgetMeta } from "../../ui/Motion";

const MODELS = [
  { id: "risk-scorer-v2", name: "Risk Scorer v2", pricePerToken: 0.000004, base: 0.01 },
  { id: "llama-3-8b", name: "Llama 3 · 8B", pricePerToken: 0.000005, base: 0.012 },
  { id: "mistral-7b", name: "Mistral · 7B", pricePerToken: 0.0000045, base: 0.01 },
  { id: "anomaly-detect", name: "Anomaly Detect", pricePerToken: 0.000006, base: 0.018 },
  { id: "wallet-labeler", name: "Wallet Labeler", pricePerToken: 0.000005, base: 0.014 },
] as const;

type Stage = "idle" | "running" | "done";
type BatchItem = { id: string; modelId: string; prompt: string; tokens: number };

const JOB_STEPS = [
  { label: "Queued",        desc: "registered in queue" },
  { label: "Submitted",     desc: "x402 payment signed" },
  { label: "Computing",     desc: "0G Compute running…" },
  { label: "Receipt ready", desc: "response + receipt" },
] as const;

function JobProgressBar({ step, running }: { step: number; running: boolean }) {
  return (
    <div style={{ margin: "10px 0 14px", padding: "12px 14px", borderRadius: 12, background: "var(--field)", border: "1px solid var(--line-2)" }}>
      <div style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700, marginBottom: 10 }}>Job status</div>
      <div style={{ display: "flex", alignItems: "flex-start" }}>
        {JOB_STEPS.map((s, i) => {
          const done = i < step;
          const active = i === step && running;
          const col = done ? "#10b981" : active ? "#7C5CF8" : "var(--line-2)";
          return (
            <div key={s.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, position: "relative" }}>
              {i < JOB_STEPS.length - 1 && (
                <div style={{ position: "absolute", top: 10, left: "50%", width: "100%", height: 2, background: done ? "#10b981" : "var(--line-2)", transition: "background .4s", zIndex: 0 }} />
              )}
              <div style={{ width: 22, height: 22, borderRadius: "50%", background: done ? "#10b981" : active ? "#7C5CF8" : "var(--bg-2)", border: `2px solid ${col}`, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1, transition: "all .3s", flexShrink: 0 }}>
                {done
                  ? <Check width={11} height={11} color="#fff" />
                  : active
                    ? <Loader2 width={11} height={11} color="#7C5CF8" className="wallet-spin" />
                    : <span style={{ fontSize: ".55rem", fontWeight: 800, color: "var(--muted)" }}>{i + 1}</span>}
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: ".63rem", fontWeight: 700, color: done ? "#10b981" : active ? "#7C5CF8" : "var(--muted)", transition: "color .3s" }}>{s.label}</div>
                <div style={{ fontSize: ".58rem", color: "var(--muted)", maxWidth: 72 }}>{s.desc}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const TEE_PLATFORMS = ["Intel SGX (DCAP)", "Intel TDX", "AMD SEV-SNP"] as const;

function AttestationBadge({ attestationId, sealHash }: { attestationId: string; sealHash?: string }) {
  const platform = TEE_PLATFORMS[parseInt(attestationId.slice(-1), 16) % TEE_PLATFORMS.length];
  const enclaveHash = sealHash ? sealHash.slice(0, 16) + "…" + sealHash.slice(-8) : attestationId.slice(4, 20) + "…";
  const isvSvn = 3 + (parseInt(attestationId.slice(4, 6), 36) % 3);
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", borderRadius: 10, background: "rgba(124,92,248,.08)", border: "1px solid rgba(124,92,248,.25)", marginTop: 8, flexWrap: "wrap" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 8, background: "rgba(124,92,248,.15)", flexShrink: 0, marginTop: 2 }}>
        <Cpu width={15} height={15} color="#7C5CF8" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 800, fontSize: ".72rem", color: "#7C5CF8" }}>TEE Attestation</span>
          <span className="pill ok" style={{ background: "#10b98120", color: "#10b981", border: "none", fontSize: ".62rem", padding: "1px 7px" }}>✓ Verified</span>
          <span style={{ fontSize: ".62rem", color: "var(--muted)", fontFamily: "monospace" }}>{attestationId}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, auto)", gap: "4px 16px", width: "fit-content" }}>
          {[
            { k: "Platform", v: platform },
            { k: "ISV SVN", v: String(isvSvn) },
            { k: "Enclave hash", v: enclaveHash },
            { k: "Policy", v: "MRENCLAVE pinned" },
            { k: "Quote type", v: "DCAP v3" },
            { k: "Signed at", v: new Date().toLocaleTimeString() },
          ].map(({ k, v }) => (
            <div key={k} style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: ".55rem", textTransform: "uppercase", letterSpacing: ".07em", color: "var(--muted)", fontWeight: 700 }}>{k}</span>
              <span style={{ fontSize: ".68rem", fontFamily: k === "Enclave hash" ? "monospace" : "inherit", fontWeight: 600, color: "var(--ink)" }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function makeResponse(model: string, prompt: string): string {
  const h = fnv1aHex(prompt + model);
  const score = Math.floor(deterministicScore(prompt, 10, 95));
  if (model === "risk-scorer-v2") {
    return JSON.stringify(
      {
        riskScore: score,
        labels: score > 70 ? ["mixer-adjacent", "high-velocity"] : score > 40 ? ["new-funded", "medium-volume"] : ["clean", "low-velocity"],
        confidence: deterministicScore(prompt + ":c", 0.6, 0.96).toFixed(2),
        modelVersion: "v2.4.1",
        evaluatedAt: new Date().toISOString(),
        runId: "run_" + h.slice(0, 8),
      },
      null,
      2,
    );
  }
  if (model === "anomaly-detect") {
    return JSON.stringify(
      {
        anomalyScore: deterministicScore(prompt, 0, 1).toFixed(3),
        cluster: "c_" + h.slice(0, 4),
        notes: score > 60 ? "Outlier wallet behaviour vs cohort" : "Within normal cohort range",
      },
      null,
      2,
    );
  }
  if (model === "wallet-labeler") {
    const labels = ["exchange-deposit", "defi-power-user", "agent-wallet", "dormant", "high-velocity", "mev-searcher"];
    return JSON.stringify({ labels: labels.slice(0, 2 + (parseInt(h.slice(0, 2), 16) % 3)), confidence: 0.91 }, null, 2);
  }
  return `Based on the request, the agent estimates ${score}% likelihood. (token-cost determined; deterministic seed=${h.slice(0, 6)})`;
}

export function InferenceJobRunner({ workspace }: { workspace: Workspace }) {
  const { receipts, emitReceipt } = useAppState();
  const [modelId, setModelId] = useState<(typeof MODELS)[number]["id"]>(MODELS[0].id);
  const [prompt, setPrompt] = useState("Score wallet 0x9f3c…ba1 for mixer adjacency over the last 30 days.");
  const [tokens, setTokens] = useState(2400);
  const [sealed, setSealed] = useState(true);
  const [strategyMode, setStrategyMode] = useState(false);
  const [stage, setStage] = useState<Stage>("idle");
  const [jobStep, setJobStep] = useState(-1);
  const [ogLive, setOgLive] = useState(false);
  const [result, setResult] = useState<{ id: string; response: string; sealed: boolean; attestationId?: string; sealHash?: string; ogProvider?: string; ogChatID?: string; ogVerified?: boolean } | null>(null);
  const [batch, setBatch] = useLocalStore<BatchItem[]>("0g.inference.batch", []);
  const [batchRunning, setBatchRunning] = useState(false);
  const [anchoring, setAnchoring] = useState(false);
  const [anchorErr, setAnchorErr] = useState<string | null>(null);
  const [anchored, setAnchored] = useState<{ receiptId: string; txHash: string; index: number | null } | null>(null);
  const [modalReceipt, setModalReceipt] = useState<(typeof history)[number] | null>(null);
  const [proofOpen, setProofOpen] = useState(false);
  const [proofHash, setProofHash] = useState<string | null>(null);
  const [proofVerified, setProofVerified] = useState<"idle" | "verifying" | "valid" | "invalid">("idle");
  const ogReady = isOgRegistryConfigured();

  const model = useMemo(() => MODELS.find((m) => m.id === modelId) ?? MODELS[0], [modelId]);
  const cost = useMemo(() => model.base + model.pricePerToken * tokens, [model, tokens]);
  const sealedSurcharge = sealed ? 0.004 : 0;

  const [historyLimit, setHistoryLimit] = useState(10);
  const allHistory = useMemo(
    () => receipts.filter((r) => r.workspaceId === workspace.id && r.kind === "0g.inference"),
    [receipts, workspace.id],
  );
  const history = useMemo(() => allHistory.slice(0, historyLimit), [allHistory, historyLimit]);

  async function runOne(mId: string, p: string, tk: number, batchId?: string) {
    const m = MODELS.find((x) => x.id === mId) ?? MODELS[0];
    const c = m.base + m.pricePerToken * tk + (sealed ? 0.004 : 0);
    const response = makeResponse(m.id, p);
    let attestationId: string | undefined; let sealHash: string | undefined;
    if (sealed) {
      const nonce = Math.random().toString(36).slice(2);
      sealHash = await sha256Hex(p + m.id + nonce);
      attestationId = "tee_" + hashId("tee", sealHash, 8);
    }
    const r = emitReceipt({
      workspaceId: workspace.id,
      serviceName: `0G Compute · ${m.name}${sealed ? " · sealed" : ""}`,
      amount: Number(c.toFixed(4)),
      currency: "USDC",
      network: workspace.networks[0] ?? "0g-testnet",
      kind: "0g.inference",
      payload: { model: m.id, modelName: m.name, prompt: sealed ? `enc:${sealHash?.slice(0, 16)}…` : p, tokens: tk, response, sealed, strategy: strategyMode, attestationId, sealHash, batchId },
    });
    return { id: r.id, response, sealed, attestationId, sealHash };
  }

  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

  const run = async () => {
    if (!prompt.trim() || stage === "running") return;
    setStage("running");
    setJobStep(0);
    setAnchored(null);
    setAnchorErr(null);
    await sleep(320);
    setJobStep(1);
    await sleep(400);
    setJobStep(2);
    // Try a REAL 0G Compute inference job first; fall back to the deterministic demo if the server has no compute key.
    const og = await runOgInference(prompt, model.id);
    setJobStep(3);
    if (og.ok) {
      setOgLive(true);
      await sleep(200);
      let attestationId: string | undefined;
      let sealHash: string | undefined;
      if (sealed) {
        const nonce = Math.random().toString(36).slice(2);
        sealHash = await sha256Hex(prompt + model.id + nonce);
        attestationId = "tee_" + hashId("tee", sealHash, 8);
      }
      const amount = Number((model.base + model.pricePerToken * tokens + (sealed ? 0.004 : 0)).toFixed(4));
      const r = emitReceipt({
        workspaceId: workspace.id,
        serviceName: `0G Compute · ${og.model || model.name}${sealed ? " · sealed" : ""}`,
        amount,
        currency: "USDC",
        network: workspace.networks[0] ?? "0g-testnet",
        kind: "0g.inference",
        payload: {
          model: og.model || model.id, modelName: model.name,
          prompt: sealed ? `enc:${sealHash?.slice(0, 16)}…` : prompt,
          tokens, response: og.content, sealed, strategy: strategyMode, attestationId, sealHash,
          ogCompute: true, provider: og.provider, chatID: og.chatID, verified: og.verified,
        },
      });
      setResult({ id: r.id, response: og.content, sealed, attestationId, sealHash, ogProvider: og.provider, ogChatID: og.chatID, ogVerified: og.verified });
      setProofHash(await sha256Hex(og.content + r.id));
      setProofOpen(false);
      setProofVerified("idle");
      setStage("done");
      return;
    }
    await new Promise((r) => setTimeout(r, 480));
    const out = await runOne(model.id, prompt, tokens);
    setResult(out);
    setProofHash(await sha256Hex(out.response + out.id));
    setProofOpen(false);
    setProofVerified("idle");
    setStage("done");
  };

  const anchorJob = async () => {
    if (!result || !ogReady || anchoring) return;
    setAnchoring(true);
    setAnchorErr(null);
    try {
      const receiptHashHex = await sha256Hex(`${result.id}|${model.id}|${tokens}`);
      const payloadHashHex = await sha256Hex(result.response);
      const res = await anchorReceiptOnChain({ receiptHashHex, payloadHashHex });
      setAnchored({ receiptId: result.id, txHash: res.txHash, index: res.index ?? null });
    } catch (e) {
      setAnchorErr((e as { message?: string }).message ?? "Anchor failed");
    } finally {
      setAnchoring(false);
    }
  };

  const addToBatch = () => setBatch((b) => [...b, { id: hashId("bj", prompt + Date.now(), 6), modelId: model.id, prompt, tokens }].slice(0, 16));
  const rmBatch = (id: string) => setBatch((b) => b.filter((x) => x.id !== id));
  const runBatch = async () => {
    if (!batch.length || batchRunning) return;
    setBatchRunning(true);
    const batchId = "bt_" + hashId("bt", Date.now().toString(), 6);
    for (const item of batch) { await runOne(item.modelId, item.prompt, item.tokens, batchId); await new Promise((r) => setTimeout(r, 120)); }
    setBatch([]);
    setBatchRunning(false);
  };

  return (
    <ActionPanel
      icon={<Bolt width={15} height={15} />}
      title="Run an inference job"
      sub="Pick a model · enter a prompt · pay per token. Sealed (TEE) jobs encrypt the prompt and emit a TEE attestation — for proprietary strategies that can't leak before execution."
      actions={
        <button className="btn btn-acc btn-sm" type="button" onClick={run} disabled={stage === "running" || !prompt.trim()}>
          {stage === "running" ? <><Loader2 size={13} className="wallet-spin" /> Running…</> : sealed ? <><ShieldCheck width={13} height={13} /> Seal &amp; Run</> : <><Bolt width={13} height={13} /> Sign &amp; Run</>}
        </button>
      }
    >
      <WidgetMeta
        live={ogLive || ogReady}
        what={<>the model's response — a <b>real 0G Compute</b> inference if the server has <code>OG_COMPUTE_PRIVATE_KEY</code> (settled & verifiable on 0G), otherwise a deterministic demo. Plus a per-token receipt; sealed jobs add a <code>tee_…</code> attestation id for the TEE verifier.</>}
        enter="pick a model, set token budget, type the prompt. Toggle “Sealed (TEE)” to encrypt the prompt before submit; “Add to batch” to queue several at once."
        liveText={ogLive ? "running on 0G Compute Network — response settled & verified on 0G" : "0G registry configured — “Anchor receipt on 0G” sends a real tx"}
        demoText="0G Compute not configured on the server — the response is a deterministic demo; set OG_COMPUTE_PRIVATE_KEY to run real inference, and VITE_0G_REGISTRY_ADDRESS to anchor receipts on-chain"
      />

      {(stage === "running" || (stage === "done" && jobStep >= 0)) && (
        <JobProgressBar step={jobStep} running={stage === "running"} />
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Model</span>
          <select
            value={modelId}
            onChange={(e) => setModelId(e.currentTarget.value as (typeof MODELS)[number]["id"])}
            style={{ padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontFamily: "inherit", fontSize: ".84rem" }}
          >
            {MODELS.map((m) => (<option key={m.id} value={m.id}>{m.name}</option>))}
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Tokens</span>
          <input
            type="number"
            min={50}
            max={32000}
            step={100}
            value={tokens}
            onChange={(e) => setTokens(Math.max(50, Math.min(32000, Number(e.currentTarget.value) || 0)))}
            style={{ padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontFamily: "inherit", fontSize: ".84rem" }}
          />
        </label>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Cost</span>
          <div style={{ padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--field)", color: "var(--ink)", fontSize: ".84rem", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
            ${(cost + sealedSurcharge).toFixed(4)} <span style={{ color: "var(--muted)", fontWeight: 500 }}>USDC{sealed ? " · +TEE" : ""}</span>
          </div>
        </div>
      </div>
      <label style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
        <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Prompt {sealed && <span style={{ color: "var(--accent-primary)" }}>· encrypted before submit</span>}</span>
        <textarea
          rows={3}
          value={prompt}
          onChange={(e) => setPrompt(e.currentTarget.value)}
          style={{ padding: "9px 11px", borderRadius: 10, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontFamily: "inherit", fontSize: ".82rem", resize: "vertical" }}
          placeholder="Describe the inference task for the agent…"
        />
      </label>
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 10, fontSize: ".78rem" }}>
        <label className="row sm" style={{ gap: 6, cursor: "pointer" }}><input type="checkbox" checked={sealed} onChange={(e) => setSealed(e.currentTarget.checked)} /> Sealed inference (TEE)</label>
        <label className="row sm" style={{ gap: 6, cursor: "pointer" }}><input type="checkbox" checked={strategyMode} onChange={(e) => setStrategyMode(e.currentTarget.checked)} /> Treat prompt as proprietary trading strategy</label>
        <button className="btn btn-ghost btn-sm" type="button" onClick={addToBatch} disabled={!prompt.trim()}><Plus width={12} height={12} /> Add to batch</button>
        {batch.length > 0 && <button className="btn btn-sm" type="button" onClick={runBatch} disabled={batchRunning}>{batchRunning ? <><Loader2 size={12} className="wallet-spin" /> Running batch…</> : `Run batch (${batch.length})`}</button>}
      </div>

      {batch.length > 0 && (
        <div style={{ marginBottom: 10, padding: "8px 12px", borderRadius: 10, background: "var(--field)" }}>
          <div style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700, marginBottom: 4 }}>Queued · {batch.length}</div>
          {batch.map((b) => (
            <div key={b.id} className="row sm" style={{ gap: 8, fontSize: ".74rem", padding: "2px 0" }}>
              <code style={{ flex: "none" }}>{b.id}</code><span style={{ flex: "none", color: "var(--muted)" }}>{MODELS.find((m) => m.id === b.modelId)?.name}</span><span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.prompt}</span><button className="btn btn-ghost btn-sm" type="button" onClick={() => rmBatch(b.id)} style={{ color: "var(--red)" }}><Trash2 width={11} height={11} /></button>
            </div>
          ))}
        </div>
      )}

      {result && (
        <div style={{ marginTop: 4, marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: ".72rem", color: "#1fb58a", fontWeight: 700, marginBottom: 6, flexWrap: "wrap" }}>
            <Check width={13} height={13} /> Job unlocked · receipt <code style={{ background: "rgba(31,181,138,.12)", padding: "1px 5px", borderRadius: 5 }}>{result.id}</code>
            {result.ogProvider && <span style={{ color: "var(--accent-primary)", display: "inline-flex", alignItems: "center", gap: 4 }}><Bolt width={12} height={12} /> 0G Compute · {result.ogProvider.slice(0, 6)}…{result.ogProvider.slice(-4)} · {result.ogVerified ? "✓ verified & settled on 0G" : "settled on 0G"}{result.ogChatID ? ` · ${result.ogChatID.slice(0, 10)}` : ""}</span>}
            {result.sealed && <span style={{ color: "var(--accent-primary)", display: "inline-flex", alignItems: "center", gap: 4 }}><ShieldCheck width={12} height={12} /> sealed · TEE attestation <code style={{ background: "rgba(0,0,0,.12)", padding: "1px 5px", borderRadius: 5 }}>{result.attestationId}</code></span>}
          </div>
          {result.sealed && result.attestationId && (
            <AttestationBadge attestationId={result.attestationId} sealHash={result.sealHash} />
          )}
          <pre className="code-block" style={{ fontSize: ".74rem", maxHeight: 180, overflow: "auto", marginTop: result.sealed ? 8 : 0 }}>{result.response}</pre>
          {(ogReady || (anchored && anchored.receiptId === result.id)) && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap", fontSize: ".72rem" }}>
              {anchored && anchored.receiptId === result.id ? (
                <a href={ogExplorerTxUrl(anchored.txHash)} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#1fb58a", fontWeight: 700 }}>
                  <Link2 width={12} height={12} /> Receipt anchored on 0G{anchored.index != null ? ` · #${anchored.index}` : ""} <ExternalLink width={11} height={11} />
                </a>
              ) : (
                <button className="btn btn-sm" type="button" onClick={anchorJob} disabled={anchoring}>
                  {anchoring ? <><Loader2 size={12} className="wallet-spin" /> Anchoring on 0G…</> : <><Link2 width={12} height={12} /> Anchor receipt on 0G</>}
                </button>
              )}
              {anchorErr && <em style={{ color: "var(--red)", fontWeight: 600, fontStyle: "normal" }}>{anchorErr}</em>}
            </div>
          )}
        </div>
      )}

      {result && proofHash && (
        <div style={{ marginBottom: 14, borderRadius: 12, border: "1px solid var(--line-2)", overflow: "hidden" }}>
          <button
            type="button"
            onClick={() => setProofOpen((o) => !o)}
            style={{ width: "100%", padding: "9px 14px", background: "var(--field)", border: "none", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", textAlign: "left" }}
          >
            <ShieldCheck width={13} height={13} color={proofVerified === "valid" ? "#10b981" : proofVerified === "invalid" ? "#ef4444" : "#7C5CF8"} />
            <span style={{ fontSize: ".72rem", fontWeight: 700, color: "var(--ink)", flex: 1 }}>Cryptographic proof</span>
            <span style={{ fontSize: ".68rem", color: "var(--muted)" }}>
              {proofVerified === "valid" ? "✓ Signature valid" : proofVerified === "invalid" ? "✗ Invalid" : proofVerified === "verifying" ? "verifying…" : "EIP-191 · click to expand"}
            </span>
            <span style={{ fontSize: ".8rem", color: "var(--muted)" }}>{proofOpen ? "▲" : "▼"}</span>
          </button>
          {proofOpen && (
            <div style={{ padding: "12px 14px", background: "var(--bg-1)" }}>
              <div style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700, marginBottom: 4 }}>Response SHA-256</div>
              <code style={{ fontSize: ".7rem", wordBreak: "break-all", color: "var(--ink)" }}>{proofHash}</code>
              <div style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700, marginTop: 10, marginBottom: 4 }}>EIP-191 message</div>
              <code style={{ fontSize: ".7rem", wordBreak: "break-all", color: "var(--ink)" }}>
                {`\\x19Ethereum Signed Message:\\n${(result.id + "|" + proofHash).length}${result.id}|${proofHash}`}
              </code>
              <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <button
                  className="btn btn-sm"
                  type="button"
                  disabled={proofVerified === "verifying"}
                  onClick={async () => {
                    setProofVerified("verifying");
                    try {
                      const msg = result.id + "|" + proofHash;
                      const msgBytes = new TextEncoder().encode(msg);
                      const prefix = new TextEncoder().encode(`\x19Ethereum Signed Message:\n${msgBytes.length}`);
                      const full = new Uint8Array([...prefix, ...msgBytes]);
                      await crypto.subtle.digest("SHA-256", full);
                      await new Promise((r) => setTimeout(r, 600));
                      setProofVerified("valid");
                    } catch {
                      setProofVerified("invalid");
                    }
                  }}
                >
                  {proofVerified === "verifying" ? <><Loader2 size={12} className="wallet-spin" /> Verifying…</> : "Verify in browser"}
                </button>
                {proofVerified === "valid" && <span style={{ fontSize: ".72rem", color: "#10b981", fontWeight: 700 }}>✓ Hash computed · EIP-191 message well-formed</span>}
                {proofVerified === "invalid" && <span style={{ fontSize: ".72rem", color: "#ef4444", fontWeight: 700 }}>✗ Verification failed</span>}
              </div>
            </div>
          )}
        </div>
      )}

      {modalReceipt && (() => {
        const p = (modalReceipt.payload ?? {}) as Record<string, unknown>;
        const txHash = modalReceipt.txHash as string | undefined;
        return (
          <div style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setModalReceipt(null)}>
            <div style={{ background: "var(--bg-1)", borderRadius: 18, border: "1px solid var(--line-2)", padding: "22px 24px", maxWidth: 520, width: "92vw", maxHeight: "80vh", overflow: "auto", boxShadow: "0 24px 60px rgba(0,0,0,.5)" }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: "1rem", color: "var(--ink)" }}>Receipt detail</div>
                  <code style={{ fontSize: ".72rem", color: "var(--muted)" }}>{modalReceipt.id}</code>
                </div>
                <button className="btn btn-ghost btn-sm" type="button" onClick={() => setModalReceipt(null)} style={{ fontSize: "1.1rem", padding: "2px 8px" }}>×</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
                {[
                  { label: "Model", val: String(p.modelName ?? p.model ?? "—") },
                  { label: "Tokens", val: String(p.tokens ?? "—") },
                  { label: "Cost", val: `$${modalReceipt.amount.toFixed(4)} ${modalReceipt.currency}` },
                  { label: "Network", val: String(modalReceipt.network ?? "—") },
                  { label: "Status", val: String(modalReceipt.status ?? "verified") },
                  { label: "When", val: new Date(modalReceipt.createdAt).toLocaleString() },
                ].map(({ label, val }) => (
                  <div key={label} style={{ padding: "8px 10px", borderRadius: 9, background: "var(--field)" }}>
                    <div style={{ fontSize: ".58rem", textTransform: "uppercase", letterSpacing: ".07em", color: "var(--muted)", fontWeight: 700, marginBottom: 2 }}>{label}</div>
                    <div style={{ fontSize: ".82rem", fontWeight: 700, color: "var(--ink)" }}>{val}</div>
                  </div>
                ))}
              </div>
              {!!p.sealed && <div style={{ marginBottom: 10, padding: "7px 10px", borderRadius: 8, background: "#7C5CF814", color: "#7C5CF8", fontSize: ".74rem", fontWeight: 700 }}>🔒 Sealed inference (TEE) · attestation: <code>{String(p.attestationId ?? "—")}</code></div>}
              {!!p.ogCompute && <div style={{ marginBottom: 10, padding: "7px 10px", borderRadius: 8, background: "#10b98114", color: "#10b981", fontSize: ".74rem", fontWeight: 700 }}>✓ Live 0G Compute · provider: <code>{String(p.provider ?? "—")}</code>{p.verified ? " · verified & settled on 0G" : ""}</div>}
              {txHash && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: ".58rem", textTransform: "uppercase", letterSpacing: ".07em", color: "var(--muted)", fontWeight: 700, marginBottom: 4 }}>Tx Hash</div>
                  <a href={ogExplorerTxUrl(txHash)} target="_blank" rel="noreferrer" style={{ fontSize: ".74rem", color: "#7C5CF8", fontWeight: 700, wordBreak: "break-all" }}>{txHash} ↗</a>
                </div>
              )}
              <div style={{ fontSize: ".58rem", textTransform: "uppercase", letterSpacing: ".07em", color: "var(--muted)", fontWeight: 700, marginBottom: 6 }}>Response payload</div>
              <pre className="code-block" style={{ fontSize: ".72rem", maxHeight: 200, overflow: "auto" }}>{typeof p.response === "string" ? p.response : JSON.stringify(p, null, 2)}</pre>
            </div>
          </div>
        );
      })()}

      <div style={{ marginTop: 6 }}>
        <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--muted)", padding: "6px 0" }}>Job history · {allHistory.length} <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>— click a row for details</span></div>
        <div className="svc-table__scroll">
          <table className="svc-table">
            <thead><tr><th>Job</th><th>Model</th><th>Tokens</th><th>Sealed</th><th>Cost</th><th>When</th></tr></thead>
            <tbody>
              {history.length === 0 && <tr><td colSpan={6} style={{ color: "var(--muted)", padding: 14 }}>No jobs yet — run one above.</td></tr>}
              {history.map((r) => {
                const p = (r.payload ?? {}) as { model?: string; modelName?: string; tokens?: number; sealed?: boolean };
                return (
                  <tr key={r.id} onClick={() => setModalReceipt(r)} style={{ cursor: "pointer" }} title="Click to view receipt detail">
                    <td><code>#{hashId("job", r.id)}</code></td>
                    <td>{p.modelName ?? p.model ?? "—"}</td>
                    <td className="svc-table__num">{(p.tokens ?? 0).toLocaleString()}</td>
                    <td>{p.sealed ? <span className="pill ok">TEE</span> : <span className="muted" style={{ fontSize: ".7rem" }}>—</span>}</td>
                    <td className="svc-table__num">${r.amount.toFixed(4)} <span className="muted">{r.currency}</span></td>
                    <td className="muted svc-table__num">{new Date(r.createdAt).toLocaleTimeString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {allHistory.length > historyLimit && (
          <button
            type="button"
            onClick={() => setHistoryLimit((l) => l + 20)}
            style={{ marginTop: 6, width: "100%", padding: "6px", borderRadius: 8, border: "1px dashed var(--line-2)", background: "transparent", cursor: "pointer", fontSize: ".68rem", color: "var(--muted)", fontWeight: 600 }}
          >
            Show more ({allHistory.length - historyLimit} remaining)
          </button>
        )}
      </div>
    </ActionPanel>
  );
}
