import { useEffect, useState } from "react";
import { Check, ExternalLink, Link2, Loader2, PackageCheck, PenLine, Shield, X } from "lucide-react";
import type { Workspace } from "../../../types";
import { useAppState } from "../../../app-state";
import { useWallet } from "../../../wallet";
import { useLocalStore } from "../../../lib/storage";
import { sha256Hex } from "../../../lib/util-hash";
import {
  signReceipt, recoverReceiptSigner, safeVerifyDelivery, isReceiptRecorded, receiptHashFor,
  isOgRegistryConfigured, anchorReceiptOnChain, ogExplorerTxUrl, anchorDeliveryOnChain,
} from "../../../lib/og";
import { ActionPanel } from "../ActionPanel";
import { WidgetMeta } from "../../ui/Motion";

type VerifyResult =
  | { kind: "ok"; receiptId: string; receiptKind?: string; createdAt: string; payload?: Record<string, unknown> }
  | { kind: "missing"; receiptId: string }
  | { kind: "idle" };

type StoredSig = { signature: string; signer: string };
type StoredAnchor = { txHash: string; index: number | null };
const short = (a: string) => (a.length > 14 ? `${a.slice(0, 8)}…${a.slice(-6)}` : a);
const eqAddr = (a?: string, b?: string) => !!a && !!b && a.toLowerCase() === b.toLowerCase();

/** Recover a signer, swallowing malformed-signature errors so the UI just shows "mismatch". */
function safeRecover(receiptId: string, signature: string): string | null {
  try { return recoverReceiptSigner(receiptId, signature); } catch { return null; }
}

type DeliveryResult = { kind: "ok"; signer: string } | { kind: "invalid"; detail: string } | { kind: "idle" };

export function ProofVerifier({ workspace }: { workspace: Workspace }) {
  const { receipts } = useAppState();
  const wallet = useWallet();
  const [input, setInput] = useState("");
  const [out, setOut] = useState<VerifyResult>({ kind: "idle" });
  const ogReady = isOgRegistryConfigured();

  // Delivery Verifier state
  const [dReqId, setDReqId] = useState("");
  const [dRespHash, setDRespHash] = useState("");
  const [dSig, setDSig] = useState("");
  const [dResult, setDResult] = useState<DeliveryResult>({ kind: "idle" });
  const [dBusy, setDBusy] = useState(false);
  const [dAnchor, setDAnchor] = useState<{ txHash: string; explorerUrl: string } | null>(null);
  const [dAnchorErr, setDAnchorErr] = useState<string | null>(null);

  // Persisted cryptographic attestations: receiptId → { signature, signer } / { txHash, index }
  const [sigs, setSigs] = useLocalStore<Record<string, StoredSig>>("0g.receiptSigs", {});
  const [anchors, setAnchors] = useLocalStore<Record<string, StoredAnchor>>("0g.receiptAnchors", {});
  const [busy, setBusy] = useState<null | "sign" | "anchor" | "check">(null);
  const [cryptoErr, setCryptoErr] = useState<string | null>(null);
  const [recorded, setRecorded] = useState<boolean | null | undefined>(undefined); // undefined = not checked

  const id = out.kind === "ok" ? out.receiptId : "";
  const sig = id ? sigs[id] : undefined;
  const anchor = id ? anchors[id] : undefined;
  const recovered = sig ? safeRecover(id, sig.signature) : null;
  const sigValid = !!sig && !!recovered && eqAddr(recovered, sig.signer);

  // Reset the on-chain "recorded?" state whenever the inspected receipt changes.
  useEffect(() => { setRecorded(undefined); setCryptoErr(null); }, [id]);

  const verify = () => {
    const rid = input.trim();
    if (!rid) return;
    const r = receipts.find((x) => x.id === rid);
    setOut(r ? { kind: "ok", receiptId: r.id, receiptKind: r.kind, createdAt: r.createdAt, payload: r.payload } : { kind: "missing", receiptId: rid });
  };

  const signNow = async () => {
    if (!id || busy) return;
    setBusy("sign"); setCryptoErr(null);
    try {
      const res = await signReceipt(id);
      setSigs((s) => ({ ...s, [id]: { signature: res.signature, signer: res.signer } }));
    } catch (e) { setCryptoErr((e as { message?: string }).message ?? "Sign failed"); }
    finally { setBusy(null); }
  };

  const anchorNow = async () => {
    if (!id || !sig || busy) return;
    setBusy("anchor"); setCryptoErr(null);
    try {
      const receiptHashHex = await receiptHashFor(id);
      const payloadHashHex = await sha256Hex(sig.signature);
      const res = await anchorReceiptOnChain({ receiptHashHex, payloadHashHex });
      setAnchors((a) => ({ ...a, [id]: { txHash: res.txHash, index: res.index ?? null } }));
      try { setRecorded(await isReceiptRecorded(receiptHashHex)); } catch { /* leave undefined */ }
    } catch (e) { setCryptoErr((e as { message?: string }).message ?? "Anchor failed"); }
    finally { setBusy(null); }
  };

  const checkOnChain = async () => {
    if (!id || busy) return;
    setBusy("check"); setCryptoErr(null);
    try { setRecorded(await isReceiptRecorded(await receiptHashFor(id))); }
    catch { setRecorded(null); }
    finally { setBusy(null); }
  };

  const lastIds = receipts.filter((r) => r.workspaceId === workspace.id).slice(0, 4).map((r) => r.id);

  async function verifyDelivery() {
    if (!dReqId || !dRespHash || !dSig) return;
    setDBusy(true); setDResult({ kind: "idle" });
    try {
      // Use the canonical TollGate delivery sign message: "TollGate proof of delivery\nrequest: …\nresponse: …"
      const recovered = safeVerifyDelivery(dReqId, dRespHash, dSig);
      if (!recovered) {
        setDResult({ kind: "invalid", detail: "Could not recover signer — malformed signature or wrong message format" });
      } else {
        setDResult({ kind: "ok", signer: recovered });
      }
    } catch (e) {
      setDResult({ kind: "invalid", detail: (e as { message?: string }).message ?? "Verification failed" });
    } finally {
      setDBusy(false);
    }
  }

  const anchorDelivery = async () => {
    if (dResult.kind !== "ok" || !dRespHash || !dSig) return;
    setDBusy(true); setDAnchorErr(null);
    try {
      const requestHashHex = await sha256Hex(dReqId);
      const responseHashHex = dRespHash.startsWith("0x") ? dRespHash.slice(2) : dRespHash;
      const res = await anchorDeliveryOnChain({ requestHashHex, responseHashHex, signature: dSig });
      setDAnchor({ txHash: res.txHash, explorerUrl: res.explorerUrl });
    } catch (e) {
      setDAnchorErr((e as { message?: string }).message ?? "Anchor failed");
    }
    setDBusy(false);
  };

  return (
    <ActionPanel
      icon={<Shield width={15} height={15} />}
      title="Verify a receipt proof"
      sub="Paste a receipt id to inspect its payload, then have the payer wallet sign it and check the signature + the 0G on-chain record."
      actions={
        <button className="btn btn-acc btn-sm" type="button" onClick={verify} disabled={!input.trim()}>
          <Shield width={13} height={13} /> Inspect
        </button>
      }
    >
      <WidgetMeta
        live={ogReady}
        what={<>the receipt&apos;s <code>kind</code>, timestamp and full payload — then a <b>cryptographic check</b>: the payer wallet EIP-191-signs the receipt, we recover the signer, and (with a registry) confirm the same hash is recorded in <code>AgentReceiptRegistry</code> on 0G.</>}
        enter="a receipt id (rcpt_… / sig_… / pin_… — anything from the Receipts ledger or a widget). Then “Sign with my wallet” and, optionally, “Anchor on 0G”."
        liveText="0G registry configured — “Anchor on 0G” / “Check on 0G” make real reads & writes"
        demoText="signing & recovery always work (real EIP-191); set VITE_0G_REGISTRY_ADDRESS to anchor receipts on-chain and verify the record"
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8, marginBottom: 10 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Receipt id</span>
          <input
            value={input}
            onChange={(e) => setInput(e.currentTarget.value)}
            placeholder="rcpt_…"
            style={{ padding: "9px 11px", borderRadius: 10, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontFamily: "var(--mono)", fontSize: ".82rem" }}
          />
        </label>
        {lastIds.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            <span style={{ fontSize: ".64rem", color: "var(--muted)", fontWeight: 600, alignSelf: "center" }}>Recent:</span>
            {lastIds.map((rid) => (
              <button key={rid} type="button" className="pill click" onClick={() => setInput(rid)} style={{ fontFamily: "var(--mono)", fontSize: ".68rem" }}>{rid}</button>
            ))}
          </div>
        )}
      </div>

      {out.kind === "ok" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 12px", borderRadius: 10, background: "color-mix(in srgb, var(--green) 12%, transparent)", color: "var(--green)", fontSize: ".78rem", fontWeight: 700, marginBottom: 10, flexWrap: "wrap" }}>
            <Check width={14} height={14} /> Receipt found · {out.receiptKind ?? "payment"} · {new Date(out.createdAt).toLocaleString()}
          </div>

          {/* Cryptographic check */}
          <div style={{ border: "1px solid var(--line-2)", borderRadius: 12, padding: "11px 13px", marginBottom: 10, background: "var(--field)" }}>
            <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 800, color: "var(--muted)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
              <PenLine width={12} height={12} /> Cryptographic receipt
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <button className="btn btn-sm" type="button" onClick={signNow} disabled={busy !== null}>
                {busy === "sign" ? <><Loader2 size={12} className="wallet-spin" /> Signing…</> : <><PenLine width={12} height={12} /> {sig ? "Re-sign with my wallet" : "Sign with my wallet"}</>}
              </button>
              {sig && ogReady && !anchor && (
                <button className="btn btn-ghost btn-sm" type="button" onClick={anchorNow} disabled={busy !== null}>
                  {busy === "anchor" ? <><Loader2 size={12} className="wallet-spin" /> Anchoring on 0G…</> : <><Link2 width={12} height={12} /> Anchor on 0G</>}
                </button>
              )}
              {ogReady && (anchor || sig) && (
                <button className="btn btn-ghost btn-sm" type="button" onClick={checkOnChain} disabled={busy !== null}>
                  {busy === "check" ? <><Loader2 size={12} className="wallet-spin" /> Checking…</> : <>Check on 0G</>}
                </button>
              )}
            </div>

            {sig && (
              <div style={{ marginTop: 9, display: "flex", flexDirection: "column", gap: 6, fontSize: ".75rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, fontWeight: 700, color: sigValid ? "var(--green)" : "var(--red)", flexWrap: "wrap" }}>
                  {sigValid ? <Check width={13} height={13} /> : <X width={13} height={13} />}
                  {sigValid ? "Signature valid" : "Signature mismatch"} — signer <code style={{ background: "rgba(0,0,0,.12)", padding: "1px 5px", borderRadius: 5 }}>{short(sig.signer)}</code>
                  {eqAddr(sig.signer, wallet.address ?? undefined) && <span style={{ color: "var(--muted)", fontWeight: 600 }}>= your connected wallet ✓</span>}
                </div>
                {anchor ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 7, color: "var(--green)", fontWeight: 700, flexWrap: "wrap" }}>
                    <Link2 width={13} height={13} /> Anchored on 0G{anchor.index != null ? ` · #${anchor.index}` : ""} ·{" "}
                    <a href={ogExplorerTxUrl(anchor.txHash)} target="_blank" rel="noreferrer" style={{ color: "inherit", display: "inline-flex", alignItems: "center", gap: 4 }}>tx {short(anchor.txHash)} <ExternalLink width={11} height={11} /></a>
                  </div>
                ) : null}
                {recorded === true && <div style={{ color: "var(--green)", fontWeight: 700 }}>✓ AgentReceiptRegistry confirms this receipt hash is recorded on 0G</div>}
                {recorded === false && <div style={{ color: "var(--muted)" }}>this receipt hash isn&apos;t recorded on 0G yet — anchor it above</div>}
                {recorded === null && <div style={{ color: "var(--muted)" }}>couldn&apos;t reach the 0G registry (connect a wallet on the 0G chain)</div>}
                {sigValid && (anchor || recorded === true) && (
                  <div style={{ marginTop: 2, padding: "6px 10px", borderRadius: 9, background: "color-mix(in srgb, var(--green) 14%, transparent)", color: "var(--green)", fontWeight: 800 }}>
                    ✓ cryptographically verified · payer-signed · anchored on 0G
                  </div>
                )}
              </div>
            )}
            {cryptoErr && <div style={{ marginTop: 8, color: "var(--red)", fontSize: ".74rem", fontWeight: 600 }}>{cryptoErr}</div>}
          </div>

          {out.payload && Object.keys(out.payload).length > 0 && (
            <pre className="code-block" style={{ fontSize: ".74rem", maxHeight: 220, overflow: "auto" }}>{JSON.stringify(out.payload, null, 2)}</pre>
          )}
        </div>
      )}
      {out.kind === "missing" && (
        <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 12px", borderRadius: 10, background: "color-mix(in srgb, var(--red) 14%, transparent)", color: "var(--red)", fontSize: ".78rem", fontWeight: 700 }}>
          <X width={14} height={14} /> No receipt found for <code style={{ marginLeft: 4, background: "rgba(0,0,0,.16)", padding: "1px 5px", borderRadius: 5 }}>{out.receiptId}</code>
        </div>
      )}

      {/* Delivery Verifier panel */}
      <div style={{ borderTop: "1px solid var(--line-2)", marginTop: 14, paddingTop: 14 }}>
        <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 800, color: "var(--muted)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
          <PackageCheck width={12} height={12} /> Proof of Delivery — verify service signed its response
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Request ID</span>
            <input value={dReqId} onChange={(e) => setDReqId(e.target.value)} placeholder="req_… or any identifier"
              style={{ padding: "7px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontFamily: "var(--mono)", fontSize: ".8rem" }} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Response hash (sha256 of response body)</span>
            <input value={dRespHash} onChange={(e) => setDRespHash(e.target.value)} placeholder="0x…"
              style={{ padding: "7px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontFamily: "var(--mono)", fontSize: ".8rem" }} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Service signature (EIP-191)</span>
            <input value={dSig} onChange={(e) => setDSig(e.target.value)} placeholder="0x… (sign(keccak256(requestId ‖ responseHash)))"
              style={{ padding: "7px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontFamily: "var(--mono)", fontSize: ".8rem" }} />
          </label>
          <button className="btn btn-sm" type="button" onClick={verifyDelivery} disabled={dBusy || !dReqId || !dRespHash || !dSig}
            style={{ alignSelf: "flex-start" }}>
            {dBusy ? <><Loader2 size={12} className="wallet-spin" /> Verifying…</> : <><PackageCheck size={12} /> Verify Delivery</>}
          </button>
          {dResult.kind === "ok" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 12px", borderRadius: 10, background: "color-mix(in srgb, var(--green) 12%, transparent)", color: "var(--green)", fontSize: ".78rem", fontWeight: 700 }}>
                <Check size={13} /> Signature valid — signed by <code style={{ marginLeft: 4, background: "rgba(0,0,0,.12)", padding: "1px 5px", borderRadius: 5 }}>{short(dResult.signer)}</code>
              </div>
              {eqAddr(dResult.signer, wallet.address ?? undefined) && (
                <div style={{ fontSize: ".72rem", color: "var(--muted)", paddingLeft: 4 }}>= your connected wallet (this is a self-signed test receipt)</div>
              )}
              {!dAnchor && (
                <button className="btn btn-ghost btn-sm" type="button" onClick={anchorDelivery} disabled={dBusy} style={{ alignSelf: "flex-start" }}>
                  {dBusy ? <><Loader2 size={12} className="wallet-spin" /> Anchoring on 0G…</> : <><Link2 size={12} /> Anchor on 0G (DeliveryVerifier)</>}
                </button>
              )}
              {dAnchorErr && <div style={{ color: "var(--red)", fontSize: ".73rem" }}>{dAnchorErr}</div>}
              {dAnchor && (
                <div style={{ display: "flex", alignItems: "center", gap: 7, color: "var(--green)", fontWeight: 700, fontSize: ".75rem" }}>
                  <Link2 size={13} /> Anchored on 0G DeliveryVerifier ·{" "}
                  <a href={dAnchor.explorerUrl} target="_blank" rel="noreferrer" style={{ color: "inherit", display: "inline-flex", alignItems: "center", gap: 3 }}>
                    {short(dAnchor.txHash)} <ExternalLink size={11} />
                  </a>
                </div>
              )}
              <div style={{ padding: "6px 10px", borderRadius: 9, background: "color-mix(in srgb, var(--green) 10%, transparent)", fontSize: ".72rem", color: "var(--green)", fontWeight: 800 }}>
                ✓ cryptographic proof of delivery · service committed to this exact response · verifiable in DeliveryVerifier.sol
              </div>
            </div>
          )}
          {dResult.kind === "invalid" && (
            <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 12px", borderRadius: 10, background: "color-mix(in srgb, var(--red) 14%, transparent)", color: "var(--red)", fontSize: ".78rem", fontWeight: 700 }}>
              <X size={13} /> {dResult.detail}
            </div>
          )}
        </div>
        <p style={{ margin: "12px 0 0", fontSize: ".72rem", color: "var(--muted)", lineHeight: 1.5 }}>
          On-chain: <code>DeliveryVerifier.verify(requestId, responseHash, sig, serviceAddress)</code> returns bool.
          After verifying, call <code>anchor()</code> to record the delivery proof permanently.
          Deployed on Arbitrum Sepolia · Mantle · 0G Galileo.
        </p>
      </div>
    </ActionPanel>
  );
}
