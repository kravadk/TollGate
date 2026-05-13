/** KF-9: Merchant Mode — "Kustodia pattern": no-wallet, paste URL, earn crypto.
 *
 * Demo moment: live on stage — type endpoint, set $0.10/call, 30 seconds →
 * hit the gateway URL with @tollgate/sdk from another tab → receipt appears.
 */
import { type CSSProperties, useState } from "react";
import { Copy, ExternalLink, Plus, ShoppingBag, Trash2, TrendingUp } from "lucide-react";
import { useLocalStore } from "../../lib/storage";
import {
  type MerchantService,
  createMerchantService,
  recordMerchantCall,
  deleteMerchantService,
} from "../../lib/merchant";
import { ActionPanel } from "./ActionPanel";
import { API_BASE } from "../../lib/api";

const inp: CSSProperties = {
  padding: "7px 10px", borderRadius: 9, border: "1px solid var(--line-2)",
  background: "var(--bg-2)", color: "var(--ink)", fontSize: ".84rem", width: "100%",
};
const lbl: CSSProperties = {
  fontSize: ".65rem", textTransform: "uppercase" as const,
  letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700,
};
const col: CSSProperties = { display: "flex", flexDirection: "column" as const, gap: 4 };

function usd(n: number) { return `$${n.toFixed(2)}`; }

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 1400); })
      .catch(() => null);
  }
  return (
    <button onClick={copy} className="btn sm"
      style={{ padding: "3px 8px", fontSize: ".65rem", display: "inline-flex", alignItems: "center", gap: 4 }}>
      <Copy size={10} /> {copied ? "Copied!" : "Copy"}
    </button>
  );
}

const GW_BASE = API_BASE || "https://tollgate-1.onrender.com";

export function MerchantWidget() {
  const [services, setServices] = useLocalStore<MerchantService[]>("merchant.services", []);
  const [showForm, setShowForm] = useState(services.length === 0);
  const [form, setForm] = useState({ name: "", endpoint: "", priceUsd: "0.10", payoutAddress: "" });
  const [created, setCreated] = useState<MerchantService | null>(null);

  function refreshServices() {
    try { setServices(JSON.parse(localStorage.getItem("merchant.services") ?? "[]") as MerchantService[]); }
    catch { /* ignore */ }
  }

  function handleCreate() {
    if (!form.name || !form.endpoint) return;
    const svc = createMerchantService({
      name: form.name,
      endpoint: form.endpoint,
      priceUsd: parseFloat(form.priceUsd) || 0.10,
      payoutAddress: form.payoutAddress || undefined,
    });
    refreshServices();
    setCreated(svc);
    setShowForm(false);
    setForm({ name: "", endpoint: "", priceUsd: "0.10", payoutAddress: "" });
  }

  function handleSimulateCall(id: string) {
    recordMerchantCall(id);
    refreshServices();
  }

  function handleDelete(id: string) {
    deleteMerchantService(id);
    refreshServices();
    if (created?.id === id) setCreated(null);
  }

  const totalRevenue = services.reduce((s, v) => s + v.revenue, 0);
  const totalCalls   = services.reduce((s, v) => s + v.callCount, 0);

  return (
    <ActionPanel
      icon={<ShoppingBag size={15} />}
      title="Merchant Mode — Monetize Any API in 30 Seconds"
      sub={<>Paste your endpoint, set a price → get a live TollGate URL. Callers pay via x402. No wallet setup. Inspired by <strong>Kustodia ($60K)</strong>.</>}
    >
      {/* Revenue dashboard */}
      {services.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
          {[
            { label: "Total earned", val: usd(totalRevenue) },
            { label: "Total calls",  val: String(totalCalls) },
            { label: "APIs live",    val: String(services.length) },
          ].map((g) => (
            <div key={g.label} style={{ background: "var(--bg-2)", borderRadius: 10, padding: "10px 12px" }}>
              <div style={lbl}>{g.label}</div>
              <div style={{ fontWeight: 700, fontSize: ".95rem", marginTop: 2 }}>{g.val}</div>
            </div>
          ))}
        </div>
      )}

      {/* Create form */}
      {showForm ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
          <div style={{ ...lbl, marginBottom: 2 }}>Register a new paid endpoint</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div style={col}>
              <span style={lbl}>API name</span>
              <input style={inp} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="My Sentiment API" />
            </div>
            <div style={col}>
              <span style={lbl}>Price per call (USD)</span>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", fontSize: ".82rem" }}>$</span>
                <input style={{ ...inp, paddingLeft: 22 }} value={form.priceUsd} onChange={(e) => setForm((f) => ({ ...f, priceUsd: e.target.value }))} placeholder="0.10" />
              </div>
            </div>
          </div>
          <div style={col}>
            <span style={lbl}>Your endpoint URL (we proxy + charge callers)</span>
            <input style={inp} value={form.endpoint} onChange={(e) => setForm((f) => ({ ...f, endpoint: e.target.value }))} placeholder="https://my-api.example.com/v1/analyze" />
          </div>
          <div style={col}>
            <span style={lbl}>Payout wallet (optional — blank = server-custodied)</span>
            <input style={inp} value={form.payoutAddress} onChange={(e) => setForm((f) => ({ ...f, payoutAddress: e.target.value }))} placeholder="0x… or leave blank" />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn sm" onClick={handleCreate} disabled={!form.name || !form.endpoint} style={{ flex: "1 1 auto", display: "inline-flex", alignItems: "center", gap: 5 }}>
              <Plus size={12} /> Create paid API (30 sec)
            </button>
            {services.length > 0 && (
              <button className="btn sm" onClick={() => setShowForm(false)} style={{ flex: "0 0 auto" }}>Cancel</button>
            )}
          </div>
        </div>
      ) : (
        <button className="btn sm" onClick={() => setShowForm(true)} style={{ display: "inline-flex", alignItems: "center", gap: 5, marginBottom: 14 }}>
          <Plus size={11} /> Add another API
        </button>
      )}

      {/* Just-created banner */}
      {created && (
        <div style={{ padding: "10px 14px", borderRadius: 10, marginBottom: 14,
          background: "color-mix(in srgb, var(--green) 10%, transparent)",
          border: "1px solid color-mix(in srgb, var(--green) 30%, transparent)" }}>
          <div style={{ fontWeight: 700, color: "var(--green)", fontSize: ".82rem", marginBottom: 6 }}>
            ✓ Live in 30 seconds — your paid API is ready
          </div>
          <div style={{ fontSize: ".72rem", color: "var(--muted)", marginBottom: 4 }}>TollGate gateway URL:</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            <code style={{ fontSize: ".72rem", background: "var(--bg-2)", padding: "4px 8px", borderRadius: 7, flex: 1, wordBreak: "break-all" }}>
              {GW_BASE}/api/gateway/{created.id}
            </code>
            <CopyButton text={`${GW_BASE}/api/gateway/${created.id}`} />
          </div>
          <div style={{ fontSize: ".68rem", color: "var(--muted)", marginBottom: 4 }}>
            Test it (dev-bypass):
          </div>
          <code style={{ display: "block", fontSize: ".68rem", background: "var(--bg-2)", padding: "4px 8px", borderRadius: 7, color: "var(--ink)", wordBreak: "break-all" }}>
            {`curl -H "X-PAYMENT: dev-bypass" ${GW_BASE}/api/gateway/${created.id}`}
          </code>
        </div>
      )}

      {/* Service list */}
      {services.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {services.map((s) => (
            <div key={s.id} style={{ background: "var(--bg-2)", borderRadius: 10, padding: "10px 14px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: ".84rem" }}>{s.name}</div>
                  <div style={{ fontSize: ".64rem", color: "var(--muted)", fontFamily: "monospace", marginTop: 1 }}>{s.id}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 700, fontSize: ".88rem", color: "var(--green)" }}>{usd(s.revenue)} earned</div>
                  <div style={{ fontSize: ".62rem", color: "var(--muted)" }}>{s.callCount} calls · {usd(s.priceUsd)}/call</div>
                </div>
              </div>

              {s.callCount > 0 && (
                <div style={{ height: 3, borderRadius: 999, background: "var(--line-2)", marginBottom: 8, overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 999, background: "var(--green)", width: `${Math.min(100, s.callCount * 8)}%`, transition: "width .4s" }} />
                </div>
              )}

              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                <a href={`${GW_BASE}/api/gateway/${s.id}`} target="_blank" rel="noreferrer"
                  style={{ fontSize: ".68rem", color: "var(--muted)", display: "inline-flex", alignItems: "center", gap: 3, textDecoration: "none" }}>
                  <ExternalLink size={9} /> Live URL
                </a>
                <CopyButton text={`${GW_BASE}/api/gateway/${s.id}`} />
                <button className="btn sm" onClick={() => handleSimulateCall(s.id)}
                  style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: ".68rem" }}>
                  <TrendingUp size={9} /> Simulate call (+{usd(s.priceUsd)})
                </button>
                <button className="btn sm" onClick={() => handleDelete(s.id)}
                  style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: ".68rem",
                    background: "color-mix(in srgb, #f87171 8%, transparent)", color: "#f87171" }}>
                  <Trash2 size={9} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {services.length === 0 && !showForm && (
        <div style={{ textAlign: "center", padding: "18px 0", fontSize: ".8rem", color: "var(--muted)" }}>
          No APIs yet — create one in 30 seconds above.
        </div>
      )}

      <p style={{ margin: "14px 0 0", fontSize: ".73rem", color: "var(--muted)", lineHeight: 1.55 }}>
        Every call: <code>x402 gateway → AgentBudget.checkAndSpend() → forward to your endpoint → signed receipt on-chain</code>.
        Payout: server-custodied USDC → withdraw to any wallet. No crypto knowledge required to publish.
      </p>
    </ActionPanel>
  );
}
