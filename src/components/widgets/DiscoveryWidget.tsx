import { type CSSProperties, useState } from "react";
import { ExternalLink, Search, Plus, Database, Zap } from "lucide-react";
import { useLocalStore } from "../../lib/storage";
import { ActionPanel } from "./ActionPanel";

const CONTRACTS = [
  { label: "Arbitrum Sepolia", addr: "0xA8FdDb9F6f54Fbf127cb8c71049cB1e19f5836F9", url: "https://sepolia.arbiscan.io/address/0xA8FdDb9F6f54Fbf127cb8c71049cB1e19f5836F9" },
  { label: "0G Galileo",       addr: "0x42a14858Da4B2f75DB5C581bA5579786A12d97b4", url: "https://chainscan-galileo.0g.ai/address/0x42a14858Da4B2f75DB5C581bA5579786A12d97b4" },
];

type RegistryService = {
  serviceId: string;
  name: string;
  priceUsd: number;
  network: string;
  endpoint: string;
  provider: string;
  registeredAt: string;
};

const SEED_SERVICES: RegistryService[] = [
  { serviceId: "svc_0g_inference", name: "0G Compute · Inference", priceUsd: 0.03, network: "0g-mainnet", endpoint: "https://tollgate-1.onrender.com/api/gateway/svc_0g_inference", provider: "0xTollGate", registeredAt: "2026-05-13T00:00:00Z" },
  { serviceId: "svc_liq_wallet_risk", name: "Liquify · Wallet Risk", priceUsd: 0.05, network: "arbitrum-sepolia", endpoint: "https://tollgate-1.onrender.com/api/gateway/svc_liq_wallet_risk", provider: "0xTollGate", registeredAt: "2026-05-13T00:00:00Z" },
  { serviceId: "svc_arb_gas_oracle", name: "Arbitrum · Gas Oracle", priceUsd: 0.01, network: "arbitrum-sepolia", endpoint: "https://tollgate-1.onrender.com/api/gateway/svc_arb_gas_oracle", provider: "0xTollGate", registeredAt: "2026-05-13T00:00:00Z" },
  { serviceId: "svc_mantle_yield", name: "Mantle · Yield Optimizer", priceUsd: 0.08, network: "mantle-mainnet", endpoint: "https://tollgate-1.onrender.com/api/gateway/svc_mantle_yield", provider: "0xTollGate", registeredAt: "2026-05-13T00:00:00Z" },
  { serviceId: "svc_qie_sentiment", name: "QIE · Sentiment Analysis", priceUsd: 0.02, network: "qie-mainnet", endpoint: "https://tollgate-1.onrender.com/api/gateway/svc_qie_sentiment", provider: "0xTollGate", registeredAt: "2026-05-13T00:00:00Z" },
];

const inp: CSSProperties = { padding: "7px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".84rem", width: "100%" };
const lbl: CSSProperties = { fontSize: ".65rem", textTransform: "uppercase" as const, letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 };
const col: CSSProperties = { display: "flex", flexDirection: "column" as const, gap: 4 };

const NETWORK_COLORS: Record<string, string> = {
  "arbitrum-sepolia": "#12AAFF",
  "mantle-mainnet": "#1AC964",
  "0g-mainnet": "#A78BFA",
  "qie-mainnet": "#FB923C",
};

function netColor(network: string) {
  return NETWORK_COLORS[network] ?? "var(--muted)";
}

export function DiscoveryWidget() {
  const [services, setServices] = useLocalStore<RegistryService[]>("registry.services", SEED_SERVICES);
  const [query, setQuery] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [showRegister, setShowRegister] = useState(false);
  const [form, setForm] = useState({ serviceId: "", name: "", priceUsd: "", network: "arbitrum-sepolia", endpoint: "", provider: "" });
  const [registered, setRegistered] = useState(false);

  const maxP = parseFloat(maxPrice) || Infinity;
  const q = query.toLowerCase();
  const filtered = services
    .filter((s) => !q || s.name.toLowerCase().includes(q) || s.serviceId.toLowerCase().includes(q) || s.network.toLowerCase().includes(q))
    .filter((s) => s.priceUsd <= maxP)
    .sort((a, b) => a.priceUsd - b.priceUsd);

  const [regErr, setRegErr] = useState<string | null>(null);

  function isValidHttpsUrl(s: string): boolean {
    try {
      const u = new URL(s);
      return u.protocol === "https:" || u.protocol === "http:";
    } catch { return false; }
  }

  function register() {
    setRegErr(null);
    const serviceId = form.serviceId.trim();
    const name      = form.name.trim();
    const endpoint  = form.endpoint.trim();
    const provider  = form.provider.trim();

    if (!serviceId)             return setRegErr("Service ID is required");
    if (!/^[a-z0-9_]{3,64}$/i.test(serviceId)) return setRegErr("Service ID: 3–64 chars, letters/digits/underscore only");
    if (!name)                  return setRegErr("Name is required");
    if (name.length > 80)       return setRegErr("Name too long (max 80 chars)");
    if (!endpoint)              return setRegErr("Endpoint URL is required");
    if (!isValidHttpsUrl(endpoint)) return setRegErr("Endpoint must be a valid http(s) URL");
    if (provider && !/^0x[0-9a-fA-F]{40}$/.test(provider)) return setRegErr("Provider must be a 0x-prefixed 40-hex-char address");

    const price = parseFloat(form.priceUsd);
    if (!Number.isFinite(price) || price < 0) return setRegErr("Price must be ≥ 0");
    if (price > 10_000)                        return setRegErr("Price too high (max $10,000)");

    const svc: RegistryService = {
      serviceId,
      name,
      priceUsd: Math.round(price * 10000) / 10000,
      network: form.network,
      endpoint,
      provider: provider || "0xAnonymous",
      registeredAt: new Date().toISOString(),
    };
    setServices((prev) => [svc, ...prev.filter((s) => s.serviceId !== svc.serviceId)]);
    setForm({ serviceId: "", name: "", priceUsd: "", network: "arbitrum-sepolia", endpoint: "", provider: "" });
    setRegistered(true);
    setTimeout(() => { setRegistered(false); setShowRegister(false); }, 1800);
  }

  return (
    <ActionPanel
      icon={<Database size={15} />}
      title="ServiceRegistry — On-Chain Service Discovery"
      sub={<>Agents autonomously discover &amp; pay for services · ERC-8004 compatible · deployed on 3 chains</>}
    >
      {/* Contract links */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
        {CONTRACTS.map((c) => (
          <a key={c.label} href={c.url} target="_blank" rel="noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: ".65rem", fontWeight: 700,
              padding: "3px 8px", borderRadius: 999, background: "var(--bg-2)", border: "1px solid var(--line-2)",
              color: "var(--muted)", textDecoration: "none" }}>
            <ExternalLink size={10} /> {c.label} · {c.addr.slice(0, 8)}…
          </a>
        ))}
      </div>

      {/* Search + filter row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, marginBottom: 10 }}>
        <div style={{ position: "relative" }}>
          <Search size={12} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
          <input style={{ ...inp, paddingLeft: 28 }} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search services…" />
        </div>
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", fontSize: ".82rem" }}>max $</span>
          <input style={{ ...inp, paddingLeft: 36, width: 90 }} value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="∞" />
        </div>
      </div>

      {/* Result count + register toggle */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ ...lbl }}>{filtered.length} service{filtered.length !== 1 ? "s" : ""} found · sorted cheapest-first</span>
        <button className="btn sm" onClick={() => setShowRegister((v) => !v)} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          <Plus size={11} /> Register
        </button>
      </div>

      {/* Service list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "18px 0", fontSize: ".8rem", color: "var(--muted)" }}>No services match your filter.</div>
        )}
        {filtered.map((s) => (
          <div key={s.serviceId} style={{ background: "var(--bg-2)", borderRadius: 10, padding: "10px 12px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" as const }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: ".84rem", color: "var(--ink)", marginBottom: 2 }}>{s.name}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
                <span style={{ fontSize: ".65rem", fontFamily: "monospace", color: "var(--muted)" }}>{s.serviceId}</span>
                <span style={{ fontSize: ".65rem", padding: "1px 6px", borderRadius: 999, background: "transparent", border: `1px solid ${netColor(s.network)}`, color: netColor(s.network), fontWeight: 700 }}>
                  {s.network}
                </span>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 700, fontSize: ".92rem", color: "var(--ink)" }}>${s.priceUsd.toFixed(2)}</div>
              <div style={{ fontSize: ".6rem", color: "var(--muted)" }}>per call</div>
            </div>
            <a href={s.endpoint} target="_blank" rel="noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: ".72rem", color: "var(--muted)", textDecoration: "none" }}>
              <ExternalLink size={10} />
            </a>
          </div>
        ))}
      </div>

      {/* Register form */}
      {showRegister && (
        <div style={{ borderTop: "1px solid var(--line-2)", paddingTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ ...lbl, display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
            <Zap size={11} /> Register a paid API endpoint
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div style={col}><span style={lbl}>Service ID</span><input style={inp} value={form.serviceId} onChange={(e) => setForm((f) => ({ ...f, serviceId: e.target.value }))} placeholder="svc_myapi" /></div>
            <div style={col}><span style={lbl}>Name</span><input style={inp} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="My API · Feature" /></div>
            <div style={col}><span style={lbl}>Price (USD)</span><input style={inp} value={form.priceUsd} onChange={(e) => setForm((f) => ({ ...f, priceUsd: e.target.value }))} placeholder="0.05" /></div>
            <div style={col}>
              <span style={lbl}>Network</span>
              <select style={inp} value={form.network} onChange={(e) => setForm((f) => ({ ...f, network: e.target.value }))}>
                <option value="arbitrum-sepolia">Arbitrum Sepolia</option>
                <option value="mantle-mainnet">Mantle mainnet</option>
                <option value="0g-mainnet">0G mainnet</option>
                <option value="qie-mainnet">QIE mainnet</option>
              </select>
            </div>
          </div>
          <div style={col}><span style={lbl}>Endpoint URL</span><input style={inp} value={form.endpoint} onChange={(e) => setForm((f) => ({ ...f, endpoint: e.target.value }))} placeholder="https://my-api.example.com/v1/feature" /></div>
          <div style={col}><span style={lbl}>Provider wallet</span><input style={inp} value={form.provider} onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value }))} placeholder="0x…" /></div>
          <button className="btn sm" onClick={register} style={{ alignSelf: "flex-start" }}>
            {registered ? "✓ Registered" : "Register (simulation)"}
          </button>

          {regErr && (
            <div style={{ padding: "6px 10px", background: "color-mix(in srgb, #f87171 12%, transparent)", border: "1px solid #f8717155", borderRadius: 8, fontSize: ".7rem", color: "#f87171", fontWeight: 600 }}>
              {regErr}
            </div>
          )}
        </div>
      )}

      <p style={{ margin: "12px 0 0", fontSize: ".73rem", color: "var(--muted)", lineHeight: 1.55 }}>
        On-chain: <code>ServiceRegistry.register(serviceId, priceWei, endpoint, agentCardUri)</code> — emits <code>ServiceRegistered</code>.
        Agents call <code>getService(serviceId)</code> to resolve endpoint + price before paying.
      </p>
    </ActionPanel>
  );
}
