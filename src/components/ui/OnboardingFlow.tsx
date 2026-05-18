import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Globe2, Wallet, X, Zap } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { workspaces } from "../../data";
import { ConnectWalletButton } from "../../wallet";
import { CHAIN_LOGOS } from "../../lib/chain-logos";
import { slugifyTab } from "./AppSidebar";

const KEY = "codex:onboarded";
function hasOnboarded() { try { return localStorage.getItem(KEY) === "true"; } catch { return false; } }
function markOnboarded() { try { localStorage.setItem(KEY, "true"); } catch {} }

const variants = {
  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 48 : -48 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -48 : 48 }),
};

const BTN_PRIMARY: React.CSSProperties = {
  padding: "10px 20px", border: "none", borderRadius: 10,
  background: "#6366f1", color: "#fff", fontSize: 13.5, fontWeight: 700,
  cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
};
const BTN_GHOST: React.CSSProperties = {
  padding: "10px 16px", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10,
  background: "transparent", color: "var(--muted, #888)", fontSize: 13.5,
  cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
};

// ── Workspace logo/icon helper ────────────────────────────────────────────────
function WsLogo({ id, name, size = 28 }: { id: string; name: string; size?: number }) {
  const ws = workspaces.find((w) => w.id === id);
  if (CHAIN_LOGOS[id]) {
    return (
      <img
        src={CHAIN_LOGOS[id]}
        alt={name}
        width={size}
        height={size}
        style={{ borderRadius: Math.round(size * 0.28), objectFit: "contain" }}
        onError={(e) => { e.currentTarget.style.display = "none"; }}
      />
    );
  }
  if (ws?.Icon) return <ws.Icon size={size} />;
  return <Globe2 size={size} />;
}

// ── Step 1: Intro ─────────────────────────────────────────────────────────────
function Step1({ wsId, onNext, onSkip }: { wsId: string | null; onNext: () => void; onSkip: () => void }) {
  const ws = wsId ? workspaces.find((w) => w.id === wsId) : null;

  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ width: 64, height: 64, borderRadius: 20, background: "linear-gradient(135deg, #6366f1, #10b981)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
        <Zap size={30} color="#fff" />
      </div>
      <h2 style={{ fontSize: 26, fontWeight: 800, color: "var(--ink, #fff)", margin: "0 0 12px", letterSpacing: "-0.5px" }}>
        What is AgentPay?
      </h2>
      <p style={{ fontSize: 14.5, color: "var(--muted, #888)", lineHeight: 1.7, margin: "0 0 20px" }}>
        AgentPay is the payment rail for AI agents. Instant USDC micro-payments using the{" "}
        <strong style={{ color: "var(--ink, #fff)" }}>x402 protocol</strong> — one HTTP header, one blockchain tx, fully verifiable.
      </p>

      {ws && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 16px", background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 12, marginBottom: 20, fontSize: 13 }}>
          <WsLogo id={ws.id} name={ws.shortName} size={20} />
          <span style={{ color: "var(--ink, #fff)", fontWeight: 600 }}>You're exploring {ws.shortName}</span>
          <span style={{ color: "var(--muted, #888)" }}>· {ws.tabs.length} sections</span>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, margin: "0 0 28px", fontSize: 12, fontWeight: 700, flexWrap: "wrap" }}>
        {["Pay", "→", "Verify", "→", "Unlock"].map((t, i) => (
          <motion.span key={t} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.1 }}
            style={t === "→"
              ? { color: "var(--muted, #888)" }
              : { padding: "5px 14px", borderRadius: 20, background: i === 4 ? "rgba(16,185,129,0.15)" : "rgba(99,102,241,0.12)", color: i === 4 ? "#10b981" : "#6366f1", border: `1px solid ${i === 4 ? "rgba(16,185,129,0.3)" : "rgba(99,102,241,0.3)"}` }}
          >{t}</motion.span>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
        <button type="button" onClick={onSkip} style={BTN_GHOST}>Skip tour</button>
        <button type="button" onClick={onNext} style={BTN_PRIMARY}>
          {ws ? `Explore ${ws.shortName}` : "Choose your chain"} <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}

// ── Step 2 (global): Pick workspace ──────────────────────────────────────────
function StepPickChain({ onSelect, onBack, onSkip }: { onSelect: (id: string) => void; onBack: () => void; onSkip: () => void }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ width: 54, height: 54, borderRadius: 16, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
        <Globe2 size={26} color="#fff" />
      </div>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--ink, #fff)", margin: "0 0 6px", letterSpacing: "-0.4px" }}>Choose your chain</h2>
      <p style={{ fontSize: 13, color: "var(--muted, #888)", margin: "0 0 16px" }}>
        Pick a network to explore its tools, contracts, and agent features.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 20 }}>
        {workspaces.map((ws) => (
          <button key={ws.id} type="button" onClick={() => onSelect(ws.id)}
            style={{ padding: "11px 6px 9px", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 11, background: "rgba(255,255,255,0.04)", color: "var(--ink, #fff)", cursor: "pointer", fontSize: 11, fontWeight: 600, transition: "all 0.14s", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(99,102,241,0.13)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(99,102,241,0.35)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.08)"; }}
          >
            <WsLogo id={ws.id} name={ws.shortName} size={24} />
            <span style={{ lineHeight: 1.2, textAlign: "center" }}>{ws.shortName}</span>
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
        <button type="button" onClick={onBack} style={BTN_GHOST}><ArrowLeft size={14} /> Back</button>
        <button type="button" onClick={onSkip} style={BTN_GHOST}>Skip</button>
      </div>
    </div>
  );
}

// ── Step 2/3: Workspace tab drill-down ───────────────────────────────────────
function StepExploreTabs({ wsId, onBack, onSkip, onNext }: { wsId: string; onBack: () => void; onSkip: () => void; onNext: () => void }) {
  const navigate = useNavigate();
  const ws = workspaces.find((w) => w.id === wsId);
  if (!ws) return null;

  const goTab = (tab: string) => {
    markOnboarded();
    navigate(`/app/${ws.id}/${slugifyTab(tab)}`);
    onSkip();
  };
  const goOverview = () => {
    markOnboarded();
    navigate(`/app/${ws.id}`);
    onSkip();
  };

  const tabs = ws.tabs.filter((t) => t.toLowerCase() !== "overview").slice(0, 8);

  return (
    <div style={{ textAlign: "center" }}>
      {/* Header with real logo */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 6 }}>
        <WsLogo id={ws.id} name={ws.shortName} size={38} />
        <div style={{ textAlign: "left" }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--ink, #fff)", margin: "0 0 2px", letterSpacing: "-0.4px" }}>
            {ws.shortName}
          </h2>
          <div style={{ fontSize: 11.5, color: "var(--muted, #888)" }}>
            {ws.networks.join(" · ")}
          </div>
        </div>
      </div>

      <p style={{ fontSize: 12.5, color: "var(--muted, #888)", margin: "10px 0 14px" }}>
        {ws.tabs.length} sections — click any to open it directly
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6, marginBottom: 18, textAlign: "left" }}>
        {tabs.map((tab) => (
          <button key={tab} type="button" onClick={() => goTab(tab)}
            style={{ padding: "9px 12px", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 9, background: "rgba(255,255,255,0.04)", color: "var(--ink, #fff)", cursor: "pointer", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4, transition: "all 0.12s" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(99,102,241,0.12)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(99,102,241,0.3)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.07)"; }}
          >
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tab}</span>
            <ArrowRight size={11} style={{ color: "var(--muted, #888)", flexShrink: 0 }} />
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
        <button type="button" onClick={onBack} style={BTN_GHOST}><ArrowLeft size={14} /> Back</button>
        <button type="button" onClick={goOverview} style={{ ...BTN_GHOST, color: "var(--ink, #fff)" }}>Overview</button>
        <button type="button" onClick={onNext} style={BTN_PRIMARY}>Connect wallet <ArrowRight size={14} /></button>
      </div>
    </div>
  );
}

// ── Step: Connect wallet ──────────────────────────────────────────────────────
function StepWallet({ wsId, onBack, onSkip }: { wsId: string | null; onBack: () => void; onSkip: () => void }) {
  const ws = wsId ? workspaces.find((w) => w.id === wsId) : null;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", width: "100%" }}>
      <div style={{ width: 60, height: 60, borderRadius: 18, background: "linear-gradient(135deg, #10b981, #6366f1)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
        <Wallet size={28} color="#fff" />
      </div>
      <h2 style={{ fontSize: 23, fontWeight: 800, color: "var(--ink, #fff)", margin: "0 0 8px", letterSpacing: "-0.5px" }}>
        Connect your wallet
      </h2>
      {ws && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, fontSize: 12.5, color: "var(--muted, #888)" }}>
          <WsLogo id={ws.id} name={ws.shortName} size={16} />
          <span>for {ws.shortName} · {ws.networks[0]}</span>
        </div>
      )}
      <p style={{ fontSize: 13.5, color: "var(--muted, #888)", lineHeight: 1.7, margin: "0 0 22px", maxWidth: 310 }}>
        Required for signing receipts, staking, and x402 payments. MetaMask recommended.
      </p>
      <div style={{ marginBottom: 20 }}>
        <ConnectWalletButton />
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
        <button type="button" onClick={onBack} style={BTN_GHOST}><ArrowLeft size={14} /> Back</button>
        <button type="button" onClick={onSkip} style={BTN_GHOST}>Skip for now</button>
      </div>
    </div>
  );
}

// ── Step IDs ──────────────────────────────────────────────────────────────────
type StepId = "intro" | "pick" | "tabs" | "wallet";

export function OnboardingFlow() {
  const [done, setDone] = useState(hasOnboarded);
  const location = useLocation();

  // Detect current workspace from URL: /app/:wsId/...
  const urlWsId = (() => {
    const parts = location.pathname.split("/");
    if (parts[1] === "app" && parts[2]) {
      return workspaces.find((w) => w.id === parts[2])?.id ?? null;
    }
    return null;
  })();

  // If already in a workspace, skip the chain-picker step
  const initialFlow: StepId[] = urlWsId
    ? ["intro", "tabs", "wallet"]
    : ["intro", "pick", "tabs", "wallet"];

  const [stepIdx, setStepIdx] = useState(0);
  const [dir, setDir] = useState(1);
  const [selectedWsId, setSelectedWsId] = useState(urlWsId ?? "");

  const currentStep = initialFlow[stepIdx];
  const wsId = selectedWsId || urlWsId;

  const go = (idx: number) => {
    setDir(idx > stepIdx ? 1 : -1);
    setStepIdx(idx);
  };
  const next = () => go(Math.min(stepIdx + 1, initialFlow.length - 1));
  const back = () => go(Math.max(stepIdx - 1, 0));
  const finish = () => { markOnboarded(); setDone(true); };

  const handlePickWorkspace = (id: string) => {
    setSelectedWsId(id);
    go(stepIdx + 1);
  };

  if (done) return null;

  const maxW = currentStep === "tabs" ? 560 : currentStep === "pick" ? 520 : 460;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        position: "fixed", inset: 0, zIndex: 99000,
        background: "rgba(0,0,0,0.86)", backdropFilter: "blur(14px)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "20px 16px 68px",
      }}
    >
      <button type="button" onClick={finish} aria-label="Close" style={{ position: "absolute", top: 18, right: 18, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 8, padding: 6, cursor: "pointer", color: "var(--muted, #888)", display: "grid", placeItems: "center" }}>
        <X size={16} />
      </button>

      <AnimatePresence mode="wait" custom={dir}>
        <motion.div
          key={currentStep + selectedWsId}
          custom={dir}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
          className="glass-card"
          style={{ borderRadius: 20, padding: "32px 28px", width: "100%", maxWidth: maxW }}
        >
          {currentStep === "intro" && (
            <Step1 wsId={urlWsId} onNext={next} onSkip={finish} />
          )}
          {currentStep === "pick" && (
            <StepPickChain onSelect={handlePickWorkspace} onBack={back} onSkip={finish} />
          )}
          {currentStep === "tabs" && wsId && (
            <StepExploreTabs wsId={wsId} onBack={back} onSkip={finish} onNext={next} />
          )}
          {currentStep === "wallet" && (
            <StepWallet wsId={wsId} onBack={back} onSkip={finish} />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Progress dots — clickable to go back */}
      <div style={{ position: "absolute", bottom: 22, display: "flex", gap: 7, alignItems: "center" }}>
        {initialFlow.map((s, i) => {
          const active = i === stepIdx;
          const past = i < stepIdx;
          return (
            <motion.div
              key={s}
              onClick={() => { if (past) go(i); }}
              style={{ cursor: past ? "pointer" : "default" }}
              animate={{ width: active ? 20 : 7, opacity: active ? 1 : past ? 0.6 : 0.25, background: active ? "#6366f1" : past ? "#a5b4fc" : "#fff" }}
              transition={{ duration: 0.2 }}
            >
              <div style={{ height: 7, borderRadius: 4, background: "inherit", width: "inherit" }} />
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
