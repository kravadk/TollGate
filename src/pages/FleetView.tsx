import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Bot, ChevronDown, ChevronRight, ExternalLink, Zap, Circle } from "lucide-react";
import { agents, workspaces } from "../data";
import { useAppState } from "../app-state";
import type { Agent, Receipt } from "../types";

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// AgentRow
// ---------------------------------------------------------------------------

function AgentRow({ agent, receipts }: { agent: Agent; receipts: Receipt[] }) {
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
    <div
      style={{
        borderRadius: 14,
        border: "1px solid var(--line-2)",
        background: "var(--bg-1)",
        overflow: "hidden",
        transition: "box-shadow 0.18s",
      }}
    >
      {/* Main row */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        style={{
          width: "100%",
          display: "grid",
          gridTemplateColumns: "28px 1fr auto auto auto",
          alignItems: "center",
          gap: 12,
          padding: "13px 16px",
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          color: "inherit",
        }}
      >
        {/* Status dot */}
        <span style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Circle
            size={9}
            fill={isReady ? "#1fb58a" : "var(--muted)"}
            color={isReady ? "#1fb58a" : "var(--muted)"}
            style={isReady ? { filter: "drop-shadow(0 0 4px #1fb58a88)" } : undefined}
          />
        </span>

        {/* Name + workspace tag + last action */}
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, fontSize: ".88rem" }}>{agent.name}</span>
            {ws && (
              <span
                style={{
                  fontSize: ".62rem",
                  fontWeight: 800,
                  letterSpacing: ".06em",
                  textTransform: "uppercase",
                  padding: "2px 7px",
                  borderRadius: 99,
                  background: `${accentColor}22`,
                  color: accentColor,
                  border: `1px solid ${accentColor}40`,
                }}
              >
                {ws.shortName}
              </span>
            )}
          </div>
          <div
            style={{
              fontSize: ".72rem",
              color: "var(--muted)",
              marginTop: 2,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {lastReceipt
              ? `${lastReceipt.serviceName} · $${lastReceipt.amount.toFixed(2)} ${lastReceipt.currency}`
              : "No recent activity"}
          </div>
        </div>

        {/* Budget bar */}
        <div style={{ width: 80, display: "flex", flexDirection: "column", gap: 3, flexShrink: 0 }}>
          <div style={{ fontSize: ".6rem", color: "var(--muted)", fontWeight: 700, textAlign: "right" }}>
            ${agent.spentTodayUsd.toFixed(2)} / ${agent.dailyLimitUsd}
          </div>
          <div style={{ height: 3, borderRadius: 99, background: "var(--line-2)", overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${pct}%`,
                borderRadius: 99,
                background: pct > 80 ? "var(--red)" : accentColor,
                transition: "width .3s",
              }}
            />
          </div>
        </div>

        {/* Timestamp */}
        <span
          style={{
            fontSize: ".68rem",
            color: "var(--muted)",
            fontWeight: 600,
            flexShrink: 0,
            minWidth: 52,
            textAlign: "right",
          }}
        >
          {lastReceipt ? timeAgo(lastReceipt.createdAt) : "—"}
        </span>

        {/* Chevron */}
        <span style={{ color: "var(--muted)", flexShrink: 0 }}>
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
      </button>

      {/* Expanded peek panel */}
      {expanded && (
        <div
          style={{
            borderTop: "1px solid var(--line-2)",
            padding: "12px 16px 14px",
            background: "var(--bg-2)",
          }}
        >
          {/* Agent meta */}
          <div style={{ display: "flex", gap: 18, marginBottom: 12, fontSize: ".72rem", flexWrap: "wrap" }}>
            {(
              [
                ["Wallet", agent.wallet],
                ["Auto-pay", agent.autoPay ? "on" : "off"],
                ["Max / req", `$${agent.maxPerRequestUsd.toFixed(2)}`],
                ["Status", agent.status],
              ] as [string, string][]
            ).map(([k, v]) => (
              <div key={k}>
                <span
                  style={{
                    color: "var(--muted)",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: ".06em",
                    fontSize: ".58rem",
                  }}
                >
                  {k}{" "}
                </span>
                <span style={{ fontWeight: 600, fontFamily: k === "Wallet" ? "var(--mono)" : undefined }}>
                  {v}
                </span>
              </div>
            ))}
          </div>

          {/* Receipt list */}
          {agentReceipts.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <div
                style={{
                  fontSize: ".6rem",
                  textTransform: "uppercase",
                  letterSpacing: ".09em",
                  fontWeight: 800,
                  color: "var(--muted)",
                  marginBottom: 4,
                }}
              >
                Last {agentReceipts.length} receipts
              </div>
              {agentReceipts.map((r) => (
                <div
                  key={r.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "7px 10px",
                    borderRadius: 9,
                    background: "var(--bg-1)",
                    border: "1px solid var(--line-2)",
                    fontSize: ".74rem",
                  }}
                >
                  <Zap
                    size={11}
                    style={{
                      color:
                        r.status === "verified"
                          ? "#1fb58a"
                          : r.status === "failed"
                            ? "var(--red)"
                            : "var(--muted)",
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      flex: 1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
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
            <p style={{ fontSize: ".74rem", color: "var(--muted)" }}>No receipts yet.</p>
          )}

          {/* Open workspace CTA */}
          {ws && (
            <button
              type="button"
              onClick={() => navigate(`/app/${ws.id}`)}
              style={{
                marginTop: 12,
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontSize: ".72rem",
                fontWeight: 700,
                padding: "5px 12px",
                borderRadius: 8,
                border: `1px solid ${accentColor}55`,
                background: `${accentColor}14`,
                color: accentColor,
                cursor: "pointer",
              }}
            >
              <ExternalLink size={12} />
              Open {ws.shortName} workspace
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// FleetView
// ---------------------------------------------------------------------------

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
    <div style={{ minHeight: "100vh", background: "var(--bg-base)", color: "var(--ink)", paddingBottom: 48 }}>
      {/* Header */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          background: "var(--bg-base)",
          borderBottom: "1px solid var(--line-2)",
          backdropFilter: "blur(12px)",
          padding: "14px 24px",
          display: "flex",
          alignItems: "center",
          gap: 14,
          flexWrap: "wrap",
        }}
      >
        <Link
          to="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: ".78rem",
            fontWeight: 700,
            color: "var(--muted)",
            textDecoration: "none",
            padding: "5px 10px",
            borderRadius: 8,
            border: "1px solid var(--line-2)",
            background: "var(--bg-2)",
          }}
        >
          <ArrowLeft size={13} /> Home
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Bot size={20} style={{ color: "#7C5CF8" }} />
          <span style={{ fontWeight: 800, fontSize: "1rem", fontFamily: "var(--font-display)" }}>
            Agent Fleet
          </span>
          <span
            style={{
              fontSize: ".62rem",
              fontWeight: 800,
              letterSpacing: ".06em",
              textTransform: "uppercase",
              padding: "2px 8px",
              borderRadius: 99,
              background: "color-mix(in srgb, #1fb58a 16%, transparent)",
              color: "#1fb58a",
              border: "1px solid #1fb58a44",
            }}
          >
            {readyCount} / {agents.length} live
          </span>
        </div>

        {/* Stats */}
        <div style={{ marginLeft: "auto", display: "flex", gap: 20, alignItems: "center" }}>
          {(
            [
              ["Agents", agents.length.toString()],
              ["Active", readyCount.toString()],
              ["Spent today", `$${totalSpent.toFixed(2)}`],
            ] as [string, string][]
          ).map(([k, v]) => (
            <div key={k} style={{ textAlign: "right" }}>
              <div
                style={{
                  fontSize: ".58rem",
                  textTransform: "uppercase",
                  letterSpacing: ".08em",
                  color: "var(--muted)",
                  fontWeight: 700,
                }}
              >
                {k}
              </div>
              <div style={{ fontSize: ".9rem", fontWeight: 800 }}>{v}</div>
            </div>
          ))}
        </div>
      </header>

      {/* Body */}
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "24px 20px" }}>
        {/* Filter tabs */}
        <div
          style={{
            display: "inline-flex",
            gap: 4,
            background: "var(--bg-2)",
            border: "1px solid var(--line-2)",
            borderRadius: 10,
            padding: 4,
            marginBottom: 20,
          }}
        >
          {(["all", "ready", "paused"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              style={{
                padding: "5px 14px",
                borderRadius: 7,
                border: "none",
                cursor: "pointer",
                fontSize: ".74rem",
                fontWeight: 700,
                background: filter === f ? "var(--bg-1)" : "transparent",
                color: filter === f ? "var(--ink)" : "var(--muted)",
                boxShadow: filter === f ? "0 1px 4px rgba(0,0,0,.12)" : "none",
                textTransform: "capitalize",
                transition: "all .15s",
              }}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Column labels */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "28px 1fr 80px 52px 20px",
            gap: 12,
            padding: "0 16px 6px",
            fontSize: ".6rem",
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: ".08em",
            color: "var(--muted)",
          }}
        >
          <span />
          <span>Agent · last action</span>
          <span style={{ textAlign: "right" }}>Budget</span>
          <span style={{ textAlign: "right" }}>When</span>
          <span />
        </div>

        {/* Agent rows */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {filtered.map((a) => (
            <AgentRow key={a.id} agent={a} receipts={receipts} />
          ))}
          {filtered.length === 0 && (
            <p
              style={{
                fontSize: ".84rem",
                color: "var(--muted)",
                textAlign: "center",
                padding: "40px 0",
              }}
            >
              No agents match this filter.
            </p>
          )}
        </div>

        <p
          style={{
            marginTop: 28,
            fontSize: ".68rem",
            color: "var(--muted)",
            textAlign: "center",
          }}
        >
          Click any row to peek at the last receipts · inspired by Claude Code Agent View
        </p>
      </div>
    </div>
  );
}
