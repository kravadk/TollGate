import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Bot, CheckCircle2, ExternalLink, FileText, Fuel, Link2, ServerCog, X } from "lucide-react";
import { Spinner } from "./ui/Motion";
import { slugifyTab } from "./ui/AppSidebar";
import { anchorReceiptOnChain, isOgRegistryConfigured, ogExplorerTxUrl } from "../lib/og";
import { sha256Hex } from "../lib/util-hash";
import type { Agent, PaymentStage, Service, Workspace } from "../types";

type PaymentModalProps = {
  agent: Agent;
  service: Service | null;
  workspace: Workspace | null;
  onApproved: (service: Service, onchainTxHash?: string) => void;
  onClose: () => void;
};

const HEADER: Record<PaymentStage, string> = {
  required: "402 Payment Required",
  paying: "Submitting payment",
  verifying: "Verifying payment",
  approved: "Payment approved",
  unlocked: "Response unlocked",
};

// Static gas estimates per network (USD) — shown as a pre-flight hint.
const GAS_EST: Record<string, string> = {
  "0g-testnet":        "~$0.001",
  "0g-mainnet":        "~$0.002",
  "mantle-sepolia":    "~$0.002",
  "mantle-mainnet":    "~$0.003",
  "arbitrum-sepolia":  "~$0.003",
  "arbitrum-one":      "~$0.005",
  "base-sepolia":      "~$0.002",
  "ethereum-mainnet":  "~$0.50–$2",
};

function shortAddr(addr: string): string {
  if (!addr || addr.length < 12 || !addr.startsWith("0x")) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

/** Pick black or white text for readability on a given accent hex. */
function textOn(hex: string): string {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) return "#0a0a0a";
  const n = parseInt(m[1], 16);
  const lum = (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
  return lum > 0.58 ? "#0a0a0a" : "#ffffff";
}

export function PaymentModal({ agent, service, workspace, onApproved, onClose }: PaymentModalProps) {
  const [stage, setStage] = useState<PaymentStage>("required");
  const [anchorTx, setAnchorTx] = useState<string | null>(null);
  const timers = useRef<number[]>([]);
  const prevId = useRef<string | undefined>(undefined);
  const navigate = useNavigate();

  const accent = workspace?.accent ?? "#b7fc72";
  const open = service != null;

  // Reset to the first stage whenever a *different* service opens.
  useEffect(() => {
    if (service && service.id !== prevId.current) {
      prevId.current = service.id;
      setStage("required");
      setAnchorTx(null);
      timers.current.forEach(window.clearTimeout);
      timers.current = [];
    }
    if (!service) prevId.current = undefined;
  }, [service]);

  // Clear pending timers if the modal unmounts mid-flow.
  useEffect(() => () => timers.current.forEach(window.clearTimeout), []);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!service) return null;
  const svc = service;

  const priceParts = svc.price.split(" ");
  const amount = priceParts[0] ?? svc.price;
  const unit = priceParts.slice(1).join(" ");
  const receiptId = `rcpt_${svc.id.replace(/[^a-z0-9]/gi, "").slice(0, 8) || "tollgate"}`;
  const WsIcon = workspace?.Icon;
  const accentSoft = `color-mix(in srgb, ${accent} 16%, transparent)`;
  const inProgress = stage === "paying" || stage === "verifying";

  const pay = async () => {
    if (stage !== "required") return;
    timers.current.forEach(window.clearTimeout);
    setStage("paying");
    const eth = typeof window !== "undefined" ? (window as unknown as { ethereum?: unknown }).ethereum : undefined;
    if (isOgRegistryConfigured() && eth) {
      // Real on-chain path: anchor the receipt via AgentReceiptRegistry.record() (MetaMask sign).
      try {
        const receiptHashHex = await sha256Hex(`${svc.id}|${Date.now()}|${agent.wallet}`);
        const payloadHashHex = await sha256Hex(svc.response).catch(() => undefined);
        setStage("verifying");
        const res = await anchorReceiptOnChain({ receiptHashHex, payloadHashHex });
        setAnchorTx(res.txHash);
        onApproved(svc, res.txHash);
        setStage("approved");
        timers.current = [window.setTimeout(() => setStage("unlocked"), 850)];
        return;
      } catch {
        // user cancelled / chain error → fall through to the simulated demo flow
      }
    }
    setStage("paying");
    timers.current = [
      window.setTimeout(() => setStage("verifying"), 650),
      window.setTimeout(() => setStage("approved"), 1700),
      window.setTimeout(() => {
        onApproved(svc);
        setStage("unlocked");
      }, 2350),
    ];
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="x402-backdrop"
          role="presentation"
          onMouseDown={onClose}
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.62)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-label="x402 payment"
            onMouseDown={(e) => e.stopPropagation()}
            className="relative w-full max-w-[440px] rounded-2xl border border-border-default bg-surface-1 p-6 shadow-2xl"
            style={{ ["--ws-c" as string]: accent }}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 4 }}
            transition={{ type: "spring", damping: 24, stiffness: 280 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: accent }} />
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-text-secondary truncate">
                  {HEADER[stage]}
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="w-8 h-8 grid place-items-center rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors shrink-0"
              >
                <X size={16} />
              </button>
            </div>

            {/* Service row */}
            <div className="flex items-start gap-3 rounded-xl border border-border-default bg-surface-2 p-3.5 mb-4">
              <span
                className="w-9 h-9 shrink-0 grid place-items-center rounded-lg"
                style={{ background: accentSoft, color: accent }}
              >
                {WsIcon ? <WsIcon size={17} /> : <ServerCog size={17} />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold leading-tight truncate">{svc.name}</div>
                <div className="text-[11.5px] text-text-secondary mt-0.5 truncate">
                  {svc.category} · {svc.network}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-extrabold leading-tight">{amount}</div>
                {unit ? (
                  <div className="text-[10px] text-text-muted font-bold uppercase tracking-wider">{unit}</div>
                ) : null}
              </div>
            </div>

            {/* Route: agent → provider */}
            <div className="flex items-center gap-2 text-[11.5px] mb-5 min-w-0">
              <span className="flex items-center gap-1.5 min-w-0">
                <Bot size={13} className="text-text-muted shrink-0" />
                <span className="font-bold truncate">{agent.name}</span>
                <span className="font-mono text-text-muted shrink-0">{shortAddr(agent.wallet)}</span>
              </span>
              <ArrowRight size={13} className="text-text-muted shrink-0" />
              <span className="flex items-center gap-1.5 min-w-0">
                <ServerCog size={13} className="text-text-muted shrink-0" />
                <span className="font-bold truncate">{svc.provider}</span>
              </span>
            </div>

            {/* Stage body */}
            {stage === "required" ? (
              <>
                <div className="text-[11px] text-text-muted mb-2.5">
                  Pay once → the gateway verifies → the API response unlocks. One paid request, then the agent continues.
                </div>
                {/* Gas estimate hint */}
                {isOgRegistryConfigured() && (
                  <div className="flex items-center gap-2 mb-3 text-[11px] text-text-muted">
                    <Fuel size={11} style={{ flexShrink: 0 }} />
                    <span>Estimated gas: <strong>{GAS_EST[svc.network] ?? "~$0.01"}</strong> on {svc.network}</span>
                  </div>
                )}
                <motion.button
                  type="button"
                  onClick={pay}
                  whileHover={{ scale: 1.015 }}
                  whileTap={{ scale: 0.985 }}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    height: 46, borderRadius: 12, border: "none", cursor: "pointer",
                    background: accent, color: textOn(accent), fontSize: 14.5, fontWeight: 800,
                    boxShadow: `0 10px 28px -10px ${accent}`,
                  }}
                >
                  Pay {svc.price}
                  <ArrowRight size={16} />
                </motion.button>
                <p className="mt-3 text-[10.5px] leading-relaxed text-text-muted text-center">
                  {isOgRegistryConfigured()
                    ? <>Connect MetaMask on 0G → this anchors the receipt on-chain via <b>AgentReceiptRegistry</b> (real tx, you'll get a chainscan link). No wallet → demo mode.</>
                    : <>Demo facilitator mode — the x402 handshake is simulated. Set <b>VITE_0G_REGISTRY_ADDRESS</b> + connect a wallet for a real on-chain receipt; see the <b>x402 Gateway</b> tab.</>}
                </p>
              </>
            ) : null}

            {inProgress ? (
              <div>
                <div className="flex items-center gap-2 text-[12.5px] font-bold text-text-secondary mb-2.5">
                  <Spinner size={14} />
                  {stage === "paying" ? "Submitting payment proof…" : "Verifying receipt…"}
                </div>
                <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: accent }}
                    initial={{ width: "8%" }}
                    animate={{ width: stage === "verifying" ? "92%" : "46%" }}
                    transition={{ duration: stage === "verifying" ? 0.9 : 0.6, ease: "easeInOut" }}
                  />
                </div>
                {stage === "verifying" && anchorTx && (
                  <div className="flex items-center gap-2 mt-2.5 text-[11px] text-text-muted">
                    <span>Tx pending:</span>
                    <a href={ogExplorerTxUrl(anchorTx)} target="_blank" rel="noreferrer"
                      style={{ color: accent, fontWeight: 600, fontFamily: "monospace" }}>
                      {anchorTx.slice(0, 10)}… <ExternalLink size={10} style={{ display: "inline", verticalAlign: "middle" }} />
                    </a>
                  </div>
                )}
              </div>
            ) : null}

            {stage === "approved" ? (
              <div className="flex items-center gap-3 rounded-xl border border-border-default bg-surface-2 p-3.5">
                <CheckCircle2 size={20} style={{ color: accent }} />
                <div className="min-w-0">
                  <div className="text-[13px] font-bold">{anchorTx ? "Anchored on 0G" : "Receipt verified"}</div>
                  <div className="text-[11px] font-mono text-text-muted truncate">
                    {anchorTx ? `${anchorTx.slice(0, 12)}…${anchorTx.slice(-6)}` : `${receiptId} · ${svc.network}`}
                  </div>
                </div>
              </div>
            ) : null}

            {stage === "unlocked" ? (
              <div>
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-text-secondary mb-2">
                  <FileText size={13} /> Provider response
                </div>
                <pre
                  className="mb-4"
                  style={{
                    maxHeight: 180, overflow: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word",
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 11.5, lineHeight: 1.55,
                    background: "var(--surface-2, rgba(255,255,255,0.04))",
                    border: "1px solid var(--border-default, rgba(255,255,255,0.1))",
                    borderRadius: 8, padding: "9px 11px", margin: "0 0 16px",
                  }}
                >
                  {svc.response}
                </pre>
                {anchorTx ? (
                  <a
                    href={ogExplorerTxUrl(anchorTx)}
                    target="_blank"
                    rel="noreferrer"
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 14, fontSize: 12, fontWeight: 700, color: accent }}
                  >
                    <Link2 size={13} /> Receipt anchored on 0G — view tx <ExternalLink size={11} />
                  </a>
                ) : null}
                <div className="flex gap-2">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.015 }}
                    whileTap={{ scale: 0.985 }}
                    onClick={() => {
                      onClose();
                      if (workspace) {
                        const tab = workspace.tabs.find((t) => /receipt/i.test(t)) ?? workspace.tabs[0] ?? "Overview";
                        navigate(`/app/${workspace.id}/${slugifyTab(tab)}`);
                      }
                    }}
                    style={{
                      flex: 1, display: "flex", alignItems: "center", justifyContent: "center", height: 40,
                      borderRadius: 10, cursor: "pointer", background: "transparent",
                      border: "1px solid var(--border-default, rgba(255,255,255,0.14))",
                      color: "var(--text-secondary, #9aa)", fontSize: 13, fontWeight: 700,
                    }}
                  >
                    View receipt
                  </motion.button>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.015 }}
                    whileTap={{ scale: 0.985 }}
                    onClick={onClose}
                    style={{
                      flex: 1, display: "flex", alignItems: "center", justifyContent: "center", height: 40,
                      borderRadius: 10, border: "none", cursor: "pointer",
                      background: accent, color: textOn(accent), fontSize: 13, fontWeight: 800,
                    }}
                  >
                    Close
                  </motion.button>
                </div>
              </div>
            ) : null}
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
