import { useEffect, useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  CircleDashed,
  Clock,
  Download,
  RefreshCcw,
  Settings2,
  ShieldOff,
  XCircle,
} from "lucide-react";
import { TweaksPanel, DEFAULT_TWEAKS, tweakVars } from "./TweaksPanel";
import type { TweakState } from "./TweaksPanel";
import { ConnectWalletButton } from "../wallet";
import { initialReceipts, serviceById, workspaces, agents } from "../data";
import type { Receipt, ReceiptStatus } from "../types";

const SHOWCASE_TWEAKS_KEY = "tollgate-showcase-tweaks";

function readTweaks(): TweakState {
  try {
    const raw = window.localStorage.getItem(SHOWCASE_TWEAKS_KEY);
    if (raw) return { ...DEFAULT_TWEAKS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_TWEAKS;
}

type Filter = "all" | ReceiptStatus;

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "verified", label: "Verified" },
  { id: "paid", label: "Paid" },
  { id: "pending", label: "Pending" },
  { id: "failed", label: "Failed" },
  { id: "expired", label: "Expired" },
  { id: "replayed", label: "Replayed" },
];

const STATUS_META: Record<ReceiptStatus, { color: string; Icon: typeof BadgeCheck; label: string }> = {
  verified: { color: "#1fb58a", Icon: BadgeCheck, label: "Verified" },
  paid:     { color: "#1f7aff", Icon: CheckCircle2, label: "Paid" },
  pending:  { color: "#ff9b00", Icon: Clock, label: "Pending" },
  failed:   { color: "#e63946", Icon: XCircle, label: "Failed" },
  expired:  { color: "#9ca3af", Icon: ShieldOff, label: "Expired" },
  replayed: { color: "#a855f7", Icon: RefreshCcw, label: "Replayed" },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function initials(name: string): string {
  return name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

function workspaceFor(wsId: string) {
  return workspaces.find((w) => w.id === wsId);
}

function downloadBlob(content: string, filename: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function exportCsv(receipts: Receipt[]) {
  const header = "id,serviceName,agentName,amount,currency,network,status,txHash,createdAt";
  const rows = receipts.map((r) =>
    [r.id, `"${r.serviceName}"`, `"${r.agentName}"`, r.amount, r.currency, r.network, r.status, r.txHash, r.createdAt].join(",")
  );
  downloadBlob([header, ...rows].join("\n"), "tollgate-receipts.csv", "text/csv");
}

function exportJson(receipts: Receipt[]) {
  downloadBlob(JSON.stringify(receipts, null, 2), "tollgate-receipts.json", "application/json");
}

function agentFor(receipt: Receipt) {
  return agents.find((a) => a.workspaceId === receipt.workspaceId) ?? agents[0];
}

function StatusBadge({ status }: { status: ReceiptStatus }) {
  const meta = STATUS_META[status];
  const Icon = meta.Icon;
  return (
    <span className="rsh-badge" style={{ "--badge-color": meta.color } as React.CSSProperties}>
      <Icon size={11} strokeWidth={2.5} />
      {meta.label}
    </span>
  );
}

function ReceiptPaper({ receipt }: { receipt: Receipt }) {
  const ws = workspaceFor(receipt.workspaceId);
  const svc = serviceById(receipt.serviceId);
  const issued = new Date(receipt.createdAt);
  const due = new Date(issued.getTime() + 7 * 24 * 3600 * 1000);
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="rsh-paper">
      <div className="rsh-paper__inner">
        <div className="rsh-paper__dates">
          <span>
            <span className="rsh-paper__dt-label">ISSUED</span>
            <span className="rsh-paper__dt-val">{fmt(issued)}</span>
          </span>
          <span>
            <span className="rsh-paper__dt-label">DUE</span>
            <span className="rsh-paper__dt-val">{fmt(due)}</span>
          </span>
        </div>

        <div className="rsh-paper__cols">
          <span>DESCRIPTION</span>
          <span>CALLS</span>
          <span>PPU</span>
          <span>AMOUNT</span>
        </div>

        <div className="rsh-paper__row">
          <span>{svc?.name ?? receipt.serviceName}</span>
          <span>1</span>
          <span>${receipt.amount.toFixed(2)}</span>
          <span>${receipt.amount.toFixed(2)}</span>
        </div>
        <div className="rsh-paper__row rsh-paper__row--muted">
          <span>{svc?.description ?? "API call via x402"}</span>
          <span />
          <span />
          <span />
        </div>

        <div className="rsh-paper__totals">
          <span className="rsh-paper__totals-label">Subtotal</span>
          <span>${receipt.amount.toFixed(2)}</span>
        </div>
        <div className="rsh-paper__totals rsh-paper__totals--bold">
          <span>Total</span>
          <span>${receipt.amount.toFixed(2)} {receipt.currency}</span>
        </div>

        <div className="rsh-paper__logo">
          <span className="rsh-paper__logo-mark" />
          <span>TollGate</span>
          {ws && <span className="rsh-paper__logo-ws">× {ws.shortName}</span>}
        </div>
      </div>
      <div className="rsh-paper__zigzag" />
    </div>
  );
}

function PaymentSheet({ receipt }: { receipt: Receipt }) {
  const agent = agentFor(receipt);
  const ws = workspaceFor(receipt.workspaceId);

  const intPart = Math.floor(receipt.amount).toString();
  const decPart = (receipt.amount % 1).toFixed(2).slice(1);

  return (
    <div className="rsh-sheet">
      <div className="rsh-sheet__top">
        <span className="rsh-sheet__id">#{receipt.id}</span>
        <StatusBadge status={receipt.status} />
      </div>

      <h2 className="rsh-sheet__title">Receipt</h2>

      <div className="rsh-route">
        <div className="rsh-route__party">
          <div className="rsh-route__avatar">{initials(agent.name)}</div>
          <div>
            <div className="rsh-route__name">{agent.name}</div>
            <div className="rsh-route__sub">FROM</div>
          </div>
        </div>
        <div className="rsh-route__arrow">→</div>
        <div className="rsh-route__party">
          <div className="rsh-route__avatar rsh-route__avatar--provider">
            {initials(ws?.shortName ?? "AP")}
          </div>
          <div>
            <div className="rsh-route__name">{ws?.shortName ?? "Provider"}</div>
            <div className="rsh-route__sub">FOR</div>
          </div>
        </div>
      </div>

      <div className="rsh-amount">
        <span className="rsh-amount__sign">$</span>
        <span className="rsh-amount__int">{intPart}</span>
        <span className="rsh-amount__dec">{decPart}</span>
        <span className="rsh-amount__cur">{receipt.currency}</span>
      </div>

      <div className="rsh-meta">
        <div className="rsh-meta__row">
          <span>Service</span>
          <span>{receipt.serviceName}</span>
        </div>
        <div className="rsh-meta__row">
          <span>Network</span>
          <span>{receipt.network}</span>
        </div>
        {receipt.txHash && (
          <div className="rsh-meta__row">
            <span>Tx hash</span>
            <span className="rsh-meta__hash">{receipt.txHash.slice(0, 18)}…</span>
          </div>
        )}
        <div className="rsh-meta__row">
          <span>Payer</span>
          <span className="rsh-meta__hash">{receipt.payerWallet.slice(0, 14)}…</span>
        </div>
      </div>

      <button className="rsh-cta" type="button">
        Approve &amp; Pay
      </button>
    </div>
  );
}

export function ReceiptsShowcase({ onBack }: { onBack: () => void }) {
  const [tweaks, setTweaks] = useState<TweakState>(readTweaks);
  const [tweaksOpen, setTweaksOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(
    () => initialReceipts.find((r) => r.status === "verified")?.id ?? initialReceipts[0]?.id ?? null,
  );

  useEffect(() => {
    window.localStorage.setItem(SHOWCASE_TWEAKS_KEY, JSON.stringify(tweaks));
  }, [tweaks]);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&display=swap";
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

  const style = tweakVars(tweaks);

  const visible: Receipt[] =
    filter === "all"
      ? initialReceipts
      : initialReceipts.filter((r) => r.status === filter);

  const selected = initialReceipts.find((r) => r.id === selectedId) ?? visible[0] ?? null;

  const totalRevenue = initialReceipts
    .filter((r) => r.status === "verified" || r.status === "paid")
    .reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="rsh" style={style}>
      {/* Sidebar */}
      <aside className="rsh-side">
        <div className="rsh-side__brand">
          <span className="rsh-side__logo-mark" />
          <span className="rsh-side__name">TollGate</span>
        </div>

        <div className="rsh-side__stats">
          <div className="rsh-stat">
            <span className="rsh-stat__val">${totalRevenue.toFixed(0)}</span>
            <span className="rsh-stat__label">Revenue</span>
          </div>
          <div className="rsh-stat">
            <span className="rsh-stat__val">{initialReceipts.length}</span>
            <span className="rsh-stat__label">Receipts</span>
          </div>
        </div>

        <nav className="rsh-side__nav">
          {FILTERS.map((f) => {
            const count =
              f.id === "all"
                ? initialReceipts.length
                : initialReceipts.filter((r) => r.status === f.id).length;
            const meta = f.id !== "all" ? STATUS_META[f.id as ReceiptStatus] : null;
            return (
              <button
                key={f.id}
                className={`rsh-nav-btn${filter === f.id ? " rsh-nav-btn--active" : ""}`}
                type="button"
                onClick={() => setFilter(f.id)}
              >
                {meta ? (
                  <span
                    className="rsh-nav-dot"
                    style={{ background: meta.color }}
                  />
                ) : (
                  <CircleDashed size={11} className="rsh-nav-dot-icon" />
                )}
                <span>{f.label}</span>
                <span className="rsh-nav-count">{count}</span>
              </button>
            );
          })}
        </nav>

        <div className="rsh-side__foot">
          <div className="rsh-side__wallet">
            <ConnectWalletButton compact />
          </div>
          <button
            className="rsh-side__tweaks-btn"
            type="button"
            onClick={() => setTweaksOpen(true)}
          >
            <Settings2 size={14} />
            Customize
          </button>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              className="rsh-side__back-btn"
              type="button"
              title="Export CSV"
              onClick={() => exportCsv(visible)}
              style={{ flex: 1 }}
            >
              <Download size={12} />
              CSV
            </button>
            <button
              className="rsh-side__back-btn"
              type="button"
              title="Export JSON"
              onClick={() => exportJson(visible)}
              style={{ flex: 1 }}
            >
              <Download size={12} />
              JSON
            </button>
          </div>
          <button
            className="rsh-side__back-btn"
            type="button"
            onClick={onBack}
          >
            <ArrowLeft size={14} />
            Back
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="rsh-main">
        <header className="rsh-main__head">
          <div>
            <h1 className="rsh-main__title">Receipts</h1>
            <p className="rsh-main__sub">x402 payment ledger · {visible.length} entries</p>
          </div>
          <button className="rsh-main__new" type="button">
            + New Payment
          </button>
        </header>

        <div className="rsh-split">
          {/* List */}
          <div className="rsh-list">
            {visible.length === 0 && (
              <div className="rsh-list__empty">No receipts for this filter</div>
            )}
            {visible.map((r) => {
              const meta = STATUS_META[r.status];
              return (
                <button
                  key={r.id}
                  className={`rsh-item${r.id === selectedId ? " rsh-item--sel" : ""}`}
                  type="button"
                  onClick={() => setSelectedId(r.id)}
                >
                  <span
                    className="rsh-item__dot"
                    style={{ background: meta.color }}
                  />
                  <span className="rsh-item__body">
                    <span className="rsh-item__name">{r.serviceName}</span>
                    <span className="rsh-item__id">{r.id}</span>
                    <span className="rsh-item__agent">{r.agentName}</span>
                  </span>
                  <span className="rsh-item__right">
                    <span className="rsh-item__amt">${r.amount.toFixed(2)}</span>
                    <span className="rsh-item__time">{timeAgo(r.createdAt)}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* Detail */}
          {selected && (
            <div className="rsh-detail">
              <ReceiptPaper receipt={selected} />
              <PaymentSheet receipt={selected} />
            </div>
          )}
        </div>
      </main>

      <TweaksPanel
        open={tweaksOpen}
        state={tweaks}
        workspaces={workspaces}
        activeWorkspaceId={null}
        onClose={() => setTweaksOpen(false)}
        onChange={setTweaks}
        onSwitchWorkspace={() => {}}
      />
    </div>
  );
}
