import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Bot, ChevronDown, ChevronRight, ExternalLink, Zap, Circle } from "lucide-react";
import { agents, workspaces } from "../data";
import { useAppState } from "../app-state";
import { slugifyTab } from "../components/ui/AppSidebar";
import type { Agent, Receipt } from "../types";

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diffMs / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function budgetPct(a: Agent) {
  return Math.min(100, (a.spentTodayUsd / a.dailyLimitUsd) * 100);
}

function AgentRow({ agent, receipts, isLast }: { agent: Agent; receipts: Receipt[]; isLast: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();

  const ws = workspaces.find((w) => w.id === agent.workspaceId);
  const agentReceipts = useMemo(
    () => receipts.filter((r) => r.workspaceId === agent.workspaceId).slice(0, 5),
    [receipts, agent.workspaceId],
  );
  const lastReceipt = agentReceipts[0];
  const pct = budgetPct(agent);
  const isReady = agent.status === "Ready";
  const accentColor = ws?.accent ?? "#7C5CF8";

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        style={{
          width: "100%",
          display: "grid",
          gridTemplateColumns: "20px minmax(0,1fr) 160px 100px 80px 22px",
          alignItems: "center",
          gap: 16,
          padding: "14px 20px",
          background: expanded ? "color-mix(in srgb, var(--bg-2) 60%, transparent)" : "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          color: "inherit",
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) => {
          if (!expanded) (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-2)";
        }}
        onMouseLeave={(e) => {
          if (!expanded) (e.currentTarget as HTMLButtonElement).style.background = "none";
        }}
      >
        {/* Status dot */}
        <Circle
          size={8}
          fill={isReady ? "#22c55e" : "var(--muted)"}
          color={isReady ? "#22c55e" : "var(--muted)"}
          style={isReady ? { filter: "drop-shadow(0 0 5px #22c55e99)" } : undefined}
        />

        {/* Name + tag + last action */}
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
            <span style={{ fontWeight: 700, fontSize: ".92rem", letterSpacing: "-.01em" }}>{agent.name}</span>
            {ws && (
              <span style={{
                fontSize: ".6rem", fontWeight: 800, letterSpacing: ".07em",
                textTransform: "uppercase", padding: "2px 7px", borderRadius: 99,
                background: `${accentColor}22`, color: accentColor, border: `1px solid ${accentColor}44`,
                flexShrink: 0,
              }}>
                {ws.shortName}
              </span>
            )}
          </div>
          <div style={{
            fontSize: ".75rem", color: "var(--muted)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {lastReceipt
              ? `${lastReceipt.serviceName} · $${lastReceipt.amount.toFixed(2)} ${lastReceipt.currency}`
              : "No recent activity"}
          </div>
        </div>

        {/* Budget */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: ".7rem", color: "var(--muted)", fontWeight: 600 }}>
              ${agent.spentTodayUsd.toFixed(2)}
            </span>
            <span style={{ fontSize: ".7rem", color: "var(--muted)" }}>
              / ${agent.dailyLimitUsd}
            </span>
          </div>
          <div style={{ height: 5, borderRadius: 99, background: "var(--line-2)", overflow: "hidden" }}>
            <div style={{
              height: "100%", width: `${pct}%`, borderRadius: 99,
              background: pct > 80 ? "#ef4444" : accentColor,
              transition: "width .4s",
            }} />
          </div>
          <div style={{ fontSize: ".62rem", color: "var(--muted)", textAlign: "right" }}>
            {pct.toFixed(0)}% used
          </div>
        </div>

        {/* Status badge */}
        <span style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          fontSize: ".66rem", fontWeight: 700, padding: "3px 10px", borderRadius: 99,
          background: isReady ? "color-mix(in srgb, #22c55e 14%, transparent)" : "var(--bg-2)",
          color: isReady ? "#22c55e" : "var(--muted)",
          border: `1px solid ${isReady ? "#22c55e44" : "var(--line-2)"}`,
          textTransform: "uppercase", letterSpacing: ".06em",
        }}>
          {agent.status}
        </span>

        {/* Timestamp */}
        <span style={{ fontSize: ".72rem", color: "var(--muted)", fontWeight: 600, textAlign: "right" }}>
          {lastReceipt ? timeAgo(lastReceipt.createdAt) : "—"}
        </span>

        {/* Chevron */}
        <span style={{ color: "var(--muted)", display: "flex", justifyContent: "flex-end" }}>
          {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </span>
      </button>

      {/* Expanded panel */}
      {expanded && (
        <div style={{
          borderTop: "1px solid var(--line-2)",
          padding: "16px 20px 18px 56px",
          background: "color-mix(in srgb, var(--bg-2) 50%, transparent)",
        }}>
          {/* Agent meta chips */}
          <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
            {([
              ["Wallet", agent.wallet],
              ["Auto-pay", agent.autoPay ? "on" : "off"],
              ["Max / req", `$${agent.maxPerRequestUsd.toFixed(2)}`],
            ] as [string, string][]).map(([k, v]) => (
              <div key={k} style={{
                padding: "5px 12px", borderRadius: 8, background: "var(--bg-1)",
                border: "1px solid var(--line-2)", fontSize: ".72rem",
              }}>
                <span style={{
                  color: "var(--muted)", fontWeight: 700, marginRight: 6,
                  textTransform: "uppercase", letterSpacing: ".05em", fontSize: ".6rem",
                }}>{k}</span>
                <span style={{ fontWeight: 600, fontFamily: k === "Wallet" ? "var(--mono)" : undefined }}>
                  {k === "Wallet" ? `${v.slice(0, 6)}…${v.slice(-4)}` : v}
                </span>
              </div>
            ))}
          </div>

          {/* Receipts */}
          {agentReceipts.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <div style={{
                fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".09em",
                fontWeight: 800, color: "var(--muted)", marginBottom: 6,
              }}>
                Last {agentReceipts.length} receipts
              </div>
              {agentReceipts.map((r) => (
                <div key={r.id} style={{
                  display: "grid", gridTemplateColumns: "14px 1fr auto auto",
                  alignItems: "center", gap: 10,
                  padding: "8px 12px", borderRadius: 9,
                  background: "var(--bg-1)", border: "1px solid var(--line-2)", fontSize: ".76rem",
                }}>
                  <Zap size={12} style={{
                    color: r.status === "verified" ? "#22c55e" : r.status === "failed" ? "#ef4444" : "var(--muted)",
                    flexShrink: 0,
                  }} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.serviceName}
                  </span>
                  <span style={{ fontWeight: 700, color: accentColor, flexShrink: 0 }}>
                    ${r.amount.toFixed(2)}
                  </span>
                  <span style={{ color: "var(--muted)", flexShrink: 0, fontSize: ".66rem" }}>
                    {timeAgo(r.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: ".76rem", color: "var(--muted)" }}>No receipts yet.</p>
          )}

          {ws && (
            <button
              type="button"
              onClick={() => navigate(`/app/${ws.id}/${slugifyTab(ws.tabs[0] ?? "Overview")}`)}
              style={{
                marginTop: 14, display: "inline-flex", alignItems: "center", gap: 6,
                fontSize: ".74rem", fontWeight: 700, padding: "6px 14px",
                borderRadius: 9, border: `1px solid ${accentColor}44`,
                background: `${accentColor}14`, color: accentColor, cursor: "pointer",
              }}
            >
              <ExternalLink size={13} />
              Open {ws.shortName} workspace
            </button>
          )}
        </div>
      )}

      {!isLast && !expanded && (
        <div style={{ height: 1, background: "var(--line-2)", margin: "0 20px" }} />
      )}
    </div>
  );
}

type Filter = "all" | "ready" | "paused";

export function FleetView() {
  const { receipts } = useAppState();
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(
    () =>
      filter === "all"
        ? agents
        : agents.filter((a) =>
            filter === "ready" ? a.status === "Ready" : a.status === "Paused",
          ),
    [filter],
  );

  const totalSpent = agents.reduce((s, a) => s + a.spentTodayUsd, 0);
  const readyCount = agents.filter((a) => a.status === "Ready").length;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)", color: "var(--ink)", paddingBottom: 60 }}>
      {/* Header */}
      <header style={{
        position: "sticky", top: 0, zIndex: 20,
        background: "color-mix(in srgb, var(--bg-base) 80%, transparent)",
        borderBottom: "1px solid var(--line-2)", backdropFilter: "blur(14px)",
        padding: "0 28px", height: 58,
        display: "flex", alignItems: "center", gap: 16,
      }}>
        <Link to="/" style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          fontSize: ".76rem", fontWeight: 700, color: "var(--muted)",
          textDecoration: "none", padding: "5px 11px", borderRadius: 8,
          border: "1px solid var(--line-2)", background: "var(--bg-2)",
          flexShrink: 0,
        }}>
          <ArrowLeft size={13} /> Home
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Bot size={18} style={{ color: "#7C5CF8" }} />
          <span style={{ fontWeight: 800, fontSize: "1rem", fontFamily: "var(--font-display)" }}>
            Agent Fleet
          </span>
          <span style={{
            fontSize: ".6rem", fontWeight: 800, letterSpacing: ".06em",
            textTransform: "uppercase", padding: "2px 9px", borderRadius: 99,
            background: "color-mix(in srgb, #22c55e 14%, transparent)",
            color: "#22c55e", border: "1px solid #22c55e44",
          }}>
            {readyCount} / {agents.length} live
          </span>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 28, alignItems: "center" }}>
          {([
            ["Agents", agents.length.toString()],
            ["Active", readyCount.toString()],
            ["Spent today", `$${totalSpent.toFixed(2)}`],
          ] as [string, string][]).map(([k, v]) => (
            <div key={k} style={{ textAlign: "right" }}>
              <div style={{
                fontSize: ".57rem", textTransform: "uppercase",
                letterSpacing: ".09em", color: "var(--muted)", fontWeight: 700,
              }}>{k}</div>
              <div style={{ fontSize: ".92rem", fontWeight: 800, lineHeight: 1.1 }}>{v}</div>
            </div>
          ))}
        </div>
      </header>

      {/* Body */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 24px" }}>
        {/* Filter tabs */}
        <div style={{
          display: "inline-flex", gap: 2,
          background: "var(--bg-2)", border: "1px solid var(--line-2)",
          borderRadius: 10, padding: 3, marginBottom: 20,
        }}>
          {(["all", "ready", "paused"] as const).map((f) => (
            <button key={f} type="button" onClick={() => setFilter(f)} style={{
              padding: "5px 16px", borderRadius: 7, border: "none", cursor: "pointer",
              fontSize: ".76rem", fontWeight: 700, textTransform: "capitalize",
              background: filter === f ? "var(--bg-1)" : "transparent",
              color: filter === f ? "var(--ink)" : "var(--muted)",
              boxShadow: filter === f ? "0 1px 4px rgba(0,0,0,.14)" : "none",
              transition: "all .15s",
            }}>
              {f === "all"
                ? `All (${agents.length})`
                : f === "ready"
                  ? `Ready (${readyCount})`
                  : `Paused (${agents.length - readyCount})`}
            </button>
          ))}
        </div>

        {/* Table */}
        <div style={{
          borderRadius: 14, border: "1px solid var(--line-2)",
          background: "var(--bg-1)", overflow: "hidden",
        }}>
          {/* Column header */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "20px minmax(0,1fr) 160px 100px 80px 22px",
            gap: 16, padding: "10px 20px",
            background: "var(--bg-2)", borderBottom: "1px solid var(--line-2)",
            fontSize: ".62rem", fontWeight: 800,
            textTransform: "uppercase", letterSpacing: ".09em", color: "var(--muted)",
          }}>
            <span />
            <span>Agent · last action</span>
            <span>Budget</span>
            <span>Status</span>
            <span style={{ textAlign: "right" }}>When</span>
            <span />
          </div>

          {filtered.length > 0 ? (
            filtered.map((a, i) => (
              <AgentRow key={a.id} agent={a} receipts={receipts} isLast={i === filtered.length - 1} />
            ))
          ) : (
            <p style={{
              fontSize: ".84rem", color: "var(--muted)",
              textAlign: "center", padding: "40px 0",
            }}>
              No agents match this filter.
            </p>
          )}
        </div>

        <p style={{ marginTop: 20, fontSize: ".68rem", color: "var(--muted)", textAlign: "center" }}>
          Click any row to expand receipts and budget details
        </p>
      </div>
    </div>
  );
}
