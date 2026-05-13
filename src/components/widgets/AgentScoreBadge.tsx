import { useEffect, useState } from "react";
import { Award, TrendingUp, Zap } from "lucide-react";
import { API_BASE, API_ENABLED } from "../../lib/api";

type AgentScore = {
  agentId: string;
  score: number;
  tier: "Bronze" | "Silver" | "Gold" | "Platinum";
  receiptCount: number;
  volumeUsd: number;
  breakdown: { base: number; vol: number; pen: number };
  local?: boolean;
};

const TIER_STYLES: Record<string, string> = {
  Bronze:   "border-amber-700/50  bg-amber-950/30  text-amber-400",
  Silver:   "border-slate-500/50  bg-slate-900/30  text-slate-300",
  Gold:     "border-yellow-500/50 bg-yellow-950/30 text-yellow-300",
  Platinum: "border-blue-500/50   bg-blue-950/30   text-blue-300",
};

const TIER_RING: Record<string, string> = {
  Bronze:   "ring-amber-700/40",
  Silver:   "ring-slate-500/40",
  Gold:     "ring-yellow-500/40",
  Platinum: "ring-blue-500/40",
};

function computeLocalScore(agentId: string): AgentScore | null {
  try {
    const raw = localStorage.getItem(`budget.txLog.${agentId}`);
    if (!raw) return null;
    const log: Array<{ id: string; amount: number; ts: number; ok: boolean }> = JSON.parse(raw);
    const receipts = log.filter((t) => t.ok);
    if (receipts.length === 0) return null;
    const receiptCount = receipts.length;
    const volumeUsd = receipts.reduce((s, t) => s + t.amount, 0);
    const base = Math.min(receiptCount * 5, 500);
    const vol = Math.min(volumeUsd, 300);
    const score = Math.round(base + vol);
    const tier: AgentScore["tier"] =
      score >= 850 ? "Platinum" :
      score >= 700 ? "Gold" :
      score >= 400 ? "Silver" : "Bronze";
    return {
      agentId, score, tier, receiptCount, volumeUsd,
      breakdown: { base: Math.round(base), vol: Math.round(vol), pen: 0 },
      local: true,
    };
  } catch {
    return null;
  }
}

function ScoreRing({ score, tier }: { score: number; tier: string }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const dash = circ * (score / 1000);
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" className="shrink-0">
      <circle cx="36" cy="36" r={r} fill="none" stroke="currentColor" strokeWidth="4" className="opacity-10" />
      <circle
        cx="36" cy="36" r={r} fill="none" stroke="currentColor" strokeWidth="4"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 36 36)"
        className={
          tier === "Platinum" ? "text-blue-400" :
          tier === "Gold"     ? "text-yellow-400" :
          tier === "Silver"   ? "text-slate-300" :
                                "text-amber-500"
        }
      />
      <text x="36" y="40" textAnchor="middle" fontSize="14" fontWeight="700" fill="currentColor" className="font-mono">
        {score}
      </text>
    </svg>
  );
}

/** Inline badge — tiny, for embedding inside agent cards or table rows. */
export function AgentScoreInline({ agentId }: { agentId: string }) {
  const [score, setScore] = useState<AgentScore | null>(null);

  useEffect(() => {
    if (!agentId) return;
    if (API_ENABLED) {
      fetch(`${API_BASE}/api/agent-score/${encodeURIComponent(agentId)}`)
        .then((r) => r.json())
        .then(setScore)
        .catch(() => setScore(computeLocalScore(agentId)));
    } else {
      setScore(computeLocalScore(agentId));
    }
  }, [agentId]);

  if (!score) return null;
  const style = TIER_STYLES[score.tier] ?? TIER_STYLES.Bronze;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${style}`}>
      <Award size={10} />
      {score.tier} · {score.score}
      {score.local && <span className="opacity-50">·local</span>}
    </span>
  );
}

/** Full card — score ring, tier, receipt count, volume, formula breakdown. */
export function AgentScoreCard({ agentId, className = "" }: { agentId: string; className?: string }) {
  const [score, setScore] = useState<AgentScore | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!agentId) return;
    if (API_ENABLED) {
      setLoading(true);
      fetch(`${API_BASE}/api/agent-score/${encodeURIComponent(agentId)}`)
        .then((r) => r.json())
        .then((d) => { setScore(d); setLoading(false); })
        .catch(() => { setScore(computeLocalScore(agentId)); setLoading(false); });
    } else {
      setScore(computeLocalScore(agentId));
    }
  }, [agentId]);

  const tierStyle = score ? (TIER_STYLES[score.tier] ?? TIER_STYLES.Bronze) : "border-white/10 bg-white/5 text-white/40";
  const ringStyle = score ? (TIER_RING[score.tier] ?? "") : "";

  return (
    <div className={`rounded-xl border p-4 ${tierStyle} ring-1 ${ringStyle} ${className}`}>
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest opacity-60">
        <Award size={12} />
        AgentScore
        {score?.local && (
          <span style={{ fontSize: ".55rem", padding: "1px 5px", borderRadius: 999, border: "1px dashed currentColor", opacity: 0.5 }}>
            demo · local receipts
          </span>
        )}
      </div>

      {loading && (
        <div className="flex h-20 items-center justify-center text-xs opacity-40">Loading…</div>
      )}

      {!loading && !score && (
        <div className="flex h-20 items-center justify-center text-xs opacity-40">No receipts yet</div>
      )}

      {!loading && score && (
        <div className="flex items-center gap-4">
          <ScoreRing score={score.score} tier={score.tier} />

          <div className="min-w-0 flex-1 space-y-1">
            <div className="text-lg font-bold leading-none">{score.tier}</div>
            <div className="text-xs opacity-70">{score.score} / 1000</div>

            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
              <span className="opacity-60 flex items-center gap-1"><TrendingUp size={10} /> Receipts</span>
              <span className="font-mono font-semibold">{score.receiptCount}</span>
              <span className="opacity-60 flex items-center gap-1"><Zap size={10} /> Volume</span>
              <span className="font-mono font-semibold">${score.volumeUsd.toFixed(2)}</span>
            </div>

            <div className="mt-2 flex gap-1 text-[10px] opacity-50">
              <span>base {score.breakdown.base}</span>
              <span>+</span>
              <span>vol {score.breakdown.vol}</span>
              {score.breakdown.pen > 0 && <><span>−</span><span>pen {score.breakdown.pen}</span></>}
            </div>
          </div>
        </div>
      )}

      {!loading && score && (
        <p className="mt-3 text-[10px] leading-relaxed opacity-40">
          Score derived from x402 receipt history. Formula mirrors{" "}
          <code className="font-mono">AgentCreditRegistry.sol</code> on Mantle.
        </p>
      )}
    </div>
  );
}

/** Comparison — show multiple agents ranked by score (e.g. Strategist picks Executor). */
export function AgentScoreComparison({ agents }: { agents: { id: string; label?: string }[] }) {
  const [scores, setScores] = useState<Record<string, AgentScore>>({});

  useEffect(() => {
    for (const a of agents) {
      if (API_ENABLED) {
        fetch(`${API_BASE}/api/agent-score/${encodeURIComponent(a.id)}`)
          .then((r) => r.json())
          .then((d: AgentScore) => setScores((prev) => ({ ...prev, [a.id]: d })))
          .catch(() => {
            const local = computeLocalScore(a.id);
            if (local) setScores((prev) => ({ ...prev, [a.id]: local }));
          });
      } else {
        const local = computeLocalScore(a.id);
        if (local) setScores((prev) => ({ ...prev, [a.id]: local }));
      }
    }
  }, [agents]);

  const sorted = [...agents].sort((a, b) => (scores[b.id]?.score ?? 0) - (scores[a.id]?.score ?? 0));
  const winnerId = sorted[0]?.id;
  const hasAny = Object.keys(scores).length > 0;

  return (
    <div className="space-y-2">
      <div className="mb-3 flex items-center gap-1 text-xs font-semibold uppercase tracking-widest opacity-50">
        <Award size={11} /> Agent Score Comparison
        {hasAny && Object.values(scores).some((s) => s.local) && (
          <span style={{ fontSize: ".55rem", padding: "1px 5px", borderRadius: 999, border: "1px dashed currentColor" }}>
            local receipts
          </span>
        )}
      </div>
      {sorted.map((a, i) => {
        const s = scores[a.id];
        const tierStyle = s ? TIER_STYLES[s.tier] : "border-white/10 bg-white/5 text-white/40";
        const isWinner = a.id === winnerId && !!s;
        return (
          <div key={a.id} className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-sm ${tierStyle} ${isWinner ? "ring-1 ring-current" : ""}`}>
            <span className="w-3 font-mono text-xs opacity-50">{i + 1}.</span>
            <span className="flex-1 truncate font-medium">{a.label ?? a.id}</span>
            {s ? (
              <>
                <span className="font-mono font-bold">{s.score}</span>
                <span className="text-xs opacity-60">{s.tier}</span>
                <span className="text-[10px] opacity-40">{s.receiptCount} receipts</span>
                {isWinner && <span className="ml-1 text-[10px] font-semibold uppercase tracking-wider opacity-80">← pick</span>}
              </>
            ) : (
              <span className="text-xs opacity-30">no receipts</span>
            )}
          </div>
        );
      })}
      {!hasAny && (
        <p className="text-xs opacity-30 text-center py-2">Run the A2A loop to generate receipt data</p>
      )}
    </div>
  );
}
