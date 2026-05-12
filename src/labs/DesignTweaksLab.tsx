import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bell,
  Check,
  ChevronDown,
  CircleHelp,
  CreditCard,
  FileText,
  Folder,
  Landmark,
  LayoutDashboard,
  MessageCircle,
  MoreHorizontal,
  Receipt,
  Search,
  Settings,
  ShieldCheck,
  Shuffle,
  SlidersHorizontal,
  WalletCards,
  X,
  Zap,
} from "lucide-react";

type LabTab = "invoice" | "brand" | "desktop" | "mobile" | "swap" | "all";

type LabTweaks = {
  accent: string;
  dark: boolean;
  density: "soft" | "tight";
  radius: number;
};

type ActionReporter = (message: string) => void;

const STORAGE_KEY = "tollgate-design-tweaks-lab";

const DEFAULT_TWEAKS: LabTweaks = {
  accent: "#ff9800",
  dark: false,
  density: "soft",
  radius: 34,
};

const ACCENTS = ["#ff9800", "#ff3b30", "#d8ff2f", "#54c7ec", "#30d158"];

const TABS: { id: LabTab; label: string }[] = [
  { id: "invoice", label: "Invoice phone" },
  { id: "brand", label: "Brand kit" },
  { id: "desktop", label: "Desktop app" },
  { id: "mobile", label: "Mobile pay" },
  { id: "swap", label: "Swap flow" },
  { id: "all", label: "All" },
];

function readTweaks(): LabTweaks {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_TWEAKS, ...JSON.parse(raw) };
    }
  } catch {
    return DEFAULT_TWEAKS;
  }

  return DEFAULT_TWEAKS;
}

function LogoMark() {
  return (
    <span className="dt-logo-mark" aria-hidden="true">
      <i />
    </span>
  );
}

function SoftIcon({ children }: { children: React.ReactNode }) {
  return <span className="dt-soft-icon">{children}</span>;
}

function InvoicePhone({ onAction }: { onAction: ActionReporter }) {
  const [status, setStatus] = useState<"Pending" | "Verifying" | "Approved">("Pending");
  const [menuOpen, setMenuOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [paperLifted, setPaperLifted] = useState(false);

  const approvePayment = () => {
    if (status === "Verifying") return;
    if (status === "Approved") {
      setStatus("Pending");
      onAction("Invoice reset to pending");
      return;
    }

    setStatus("Verifying");
    onAction("x402 payment is verifying");
    window.setTimeout(() => {
      setStatus("Approved");
      onAction("Payment approved, API response unlocked");
    }, 900);
  };

  return (
    <section className="dt-panel dt-invoice-stage" aria-label="Invoice phone reference">
      <div className="dt-phone dt-phone--invoice">
        <div className="dt-phone__bezel" />
        <div className="dt-phone__screen">
          <div className="dt-status">
            <strong>9:41</strong>
            <span />
          </div>

          <div className="dt-phone-top">
            <button type="button" aria-label="Back" onClick={() => {
              setStatus("Pending");
              onAction("Invoice returned to pending state");
            }}>
              <ArrowLeft size={20} />
            </button>
            <span>IN-001</span>
            <button type="button" aria-label="Messages" onClick={() => {
              setNoteOpen((current) => !current);
              onAction("Opened invoice note");
            }}>
              <MessageCircle size={18} />
            </button>
          </div>

          {noteOpen ? (
            <div className="dt-note-bubble">
              Agent wants Wallet Risk API. Limit check passed.
            </div>
          ) : null}

          <button
            className={`dt-paper ${paperLifted ? "is-lifted" : ""}`}
            type="button"
            onClick={() => {
              setPaperLifted((current) => !current);
              onAction("Paper invoice preview toggled");
            }}
          >
            <span className="dt-paper__fold" />
            <div className="dt-paper__dates">
              <span>
                <small>Issued</small>
                <b>06.05.2026</b>
                <em>14d net</em>
              </span>
              <span>
                <small>Due</small>
                <b>20.05.2026</b>
                <em>Auto-reminder</em>
              </span>
            </div>
            <div className="dt-paper__cols">
              <span>Description</span>
              <span>Hrs</span>
              <span>PPU</span>
              <span>Amount</span>
            </div>
            {[
              ["Wallet risk", "12", "$0.05", "$2.16"],
              ["QIE checkout", "36", "$0.04", "$6.84"],
              ["0G storage", "10", "$0.02", "$2.00"],
            ].map((row) => (
              <div className="dt-paper__row" key={row[0]}>
                {row.map((cell) => (
                  <span key={cell}>{cell}</span>
                ))}
              </div>
            ))}
            <div className="dt-paper__total">
              <span>Subtotal</span>
              <b>$11,000</b>
            </div>
            <div className="dt-paper__total dt-paper__total--muted">
              <span>x402 fee</span>
              <b>$2,310</b>
            </div>
          </button>

          <div className="dt-invoice-sheet">
            <i className="dt-sheet-grab" />
            <div className="dt-sheet-head">
              <span>
                <b>Invoice</b>
                <small>IN-001</small>
              </span>
              <em data-status={status.toLowerCase()}>{status}</em>
            </div>
            <div className="dt-route">
              <span>
                <small>From</small>
                <b><LogoMark /> TollGate BV</b>
              </span>
              <i><ArrowRight size={17} /></i>
              <span>
                <small>For</small>
                <b><WalletCards size={15} /> Liquify API</b>
              </span>
            </div>
            <div className="dt-sheet-amount">
              <span><small>$</small>13,310<em>.00</em></span>
              <span>
                <small>Due</small>
                <b>20 May</b>
                <em>in 14 days</em>
              </span>
            </div>
            <div className="dt-sheet-actions">
              <button data-testid="invoice-approve" type="button" onClick={approvePayment}>
                {status === "Verifying" ? (
                  <CircleHelp size={18} />
                ) : (
                  <Check size={18} />
                )}
                {status === "Approved" ? "Reset Demo" : status === "Verifying" ? "Verifying..." : "Approve & Pay"}
              </button>
              <button data-testid="invoice-more" type="button" aria-label="More" onClick={() => {
                setMenuOpen((current) => !current);
                onAction("Invoice action menu toggled");
              }}>
                <MoreHorizontal size={20} />
              </button>
            </div>
            {menuOpen ? (
              <div className="dt-sheet-menu" data-testid="invoice-menu">
                <button type="button" onClick={() => onAction("Copied invoice payment link")}>
                  Copy payment link
                </button>
                <button type="button" onClick={() => onAction("Receipt exported as CSV")}>
                  Export receipt
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function BrandKit({
  onAccentChange,
  onAction,
}: {
  onAccentChange: (accent: string) => void;
  onAction: ActionReporter;
}) {
  const [selected, setSelected] = useState("wordmark");

  const selectTile = (tile: string) => {
    setSelected(tile);
    onAction(`${tile} selected`);
  };

  return (
    <section className="dt-brand-grid" aria-label="Brand kit reference">
      <article className="dt-brand-tile dt-palette">
        {["#ff9800", "#bebdb8", "#85847f", "#332e28", "#1f1b17"].map((color) => (
          <button
            aria-label={`Set accent ${color}`}
            key={color}
            style={{ background: color }}
            type="button"
            onClick={() => {
              onAccentChange(color);
              onAction(`Accent changed to ${color}`);
            }}
          />
        ))}
      </article>

      <button
        className={`dt-brand-tile dt-pocket ${selected === "app icon" ? "is-selected" : ""}`}
        type="button"
        onClick={() => selectTile("app icon")}
      >
        <div className="dt-pocket-icon">
          <i />
          <span />
        </div>
      </button>

      <article className="dt-brand-tile dt-icon-row">
        {[
          ["receipt", FileText],
          ["card", CreditCard],
          ["route", ArrowRight],
          ["mark", LogoMark],
          ["approved", Check],
        ].map(([label, Icon]) => (
          <button
            className={selected === label ? "is-selected" : ""}
            key={label as string}
            type="button"
            onClick={() => selectTile(label as string)}
          >
            <Icon />
          </button>
        ))}
      </article>

      <button
        className={`dt-brand-tile dt-wordmark ${selected === "wordmark" ? "is-selected" : ""}`}
        type="button"
        onClick={() => selectTile("wordmark")}
      >
        <span className="dt-wordmark__shape" />
        <strong>Agentakes</strong>
      </button>

      <button
        className={`dt-brand-tile dt-receipt-printer ${selected === "receipt printer" ? "is-selected" : ""}`}
        type="button"
        onClick={() => selectTile("receipt printer")}
      >
        <div className="dt-printer">
          <span />
          <i />
        </div>
        <div className="dt-mini-receipt">
          <div><span>Description</span><span>PPU</span><span>Amount</span></div>
          <div><b>Wallet risk</b><span>$0.05</span><span>$2.16</span></div>
          <div><b>Inference</b><span>$0.03</span><span>$6.84</span></div>
          <em>Agentakes</em>
        </div>
      </button>

      <button
        className={`dt-brand-tile dt-type-tile ${selected === "type tile" ? "is-selected" : ""}`}
        type="button"
        onClick={() => selectTile("type tile")}
      >
        <span>AI API calls</span>
        <span>Policies</span>
        <strong>Invoices</strong>
        <span>Receipts</span>
        <span>Payments</span>
      </button>
    </section>
  );
}

const DESKTOP_ENDPOINTS = [
  ["Wallet Risk API", "Risk", "$0.020"],
  ["Yield Risk Feed", "Data", "$0.050"],
  ["BTC Trading Signal", "Signal", "$0.120"],
  ["Tax Classification", "Inference", "$0.080"],
  ["0G Storage Job", "Storage", "$0.020"],
  ["QIE Checkout", "Checkout", "$0.010"],
] as const;

const DESKTOP_SERVICES = [
  ["Wallet Risk API", "active", "4,821", "$96.42"],
  ["Yield Risk Feed", "active", "1,290", "$64.50"],
  ["BTC Trading Signal", "paused", "642", "$77.04"],
  ["0G Storage Job", "active", "990", "$19.80"],
] as const;

const DESKTOP_AGENTS = [
  ["agent_yield_researcher", "$3.42 / $10.00", "auto-pay on", "active"],
  ["agent_quant_01", "$8.91 / $25.00", "3 networks", "active"],
  ["agent_book_keeper", "$0.78 / $5.00", "tax policy", "active"],
] as const;

const DESKTOP_RECEIPTS = [
  ["Wallet Risk API", "agent_yield_researcher", "$0.020", "12:42 PM"],
  ["Yield Risk Feed", "agent_yield_researcher", "$0.050", "12:41 PM"],
  ["BTC Trading Signal", "agent_quant_01", "$0.120", "12:38 PM"],
  ["QIE Checkout", "agent_book_keeper", "$0.010", "12:30 PM"],
] as const;

const DESKTOP_NAV_ITEMS = [
  ["Overview", LayoutDashboard],
  ["My Services", Zap],
  ["Marketplace", Folder],
  ["Agents", WalletCards],
  ["Receipts", Receipt],
] as const;

type DesktopNav = (typeof DESKTOP_NAV_ITEMS)[number][0];

function DesktopApp({ onAction }: { onAction: ActionReporter }) {
  const [activeNav, setActiveNav] = useState<DesktopNav>("Marketplace");
  const [query, setQuery] = useState("");
  const [paidEndpoint, setPaidEndpoint] = useState<string | null>(null);
  const [paidCount, setPaidCount] = useState(48_920);
  const [managedService, setManagedService] = useState("Wallet Risk API");
  const [selectedAgent, setSelectedAgent] = useState("agent_yield_researcher");
  const [selectedReceipt, setSelectedReceipt] = useState("Wallet Risk API");
  const [verifiedReceipt, setVerifiedReceipt] = useState<string | null>(null);

  const filteredEndpoints = DESKTOP_ENDPOINTS.filter(([name, tag]) =>
    `${name} ${tag}`.toLowerCase().includes(query.toLowerCase()),
  );

  const payEndpoint = (name: string) => {
    setPaidEndpoint(name);
    setPaidCount((count) => count + 1);
    onAction(`${name} unlocked through x402`);
  };

  const openNav = (nextNav: DesktopNav) => {
    setActiveNav(nextNav);
    onAction(`${nextNav} opened`);
  };

  const renderOverview = () => (
    <section className="dt-overview-grid" data-testid="desktop-overview-view">
      <article className="dt-overview-hero">
        <small>Revenue - last 7 days</small>
        <strong>$4,820.41</strong>
        <span>+18.4%</span>
        <div className="dt-overview-bars" aria-hidden="true">
          {[42, 54, 38, 68, 52, 44, 36].map((height, index) => (
            <i key={index} style={{ height: `${height}%` }} />
          ))}
        </div>
      </article>

      <div className="dt-overview-stack">
        {[
          ["Paid requests", paidCount.toLocaleString(), "today - 99.2% success"],
          ["Avg price", "$0.043", "per call"],
          ["Active services", "7", "1 paused"],
        ].map(([label, value, caption]) => (
          <article className="dt-metric-card" key={label}>
            <LogoMark />
            <small>{label}</small>
            <strong>{value}</strong>
            <span>{caption}</span>
          </article>
        ))}
      </div>

      <article className="dt-overview-table">
        <div>
          <span>
            <small>Top services</small>
            <b>Live paid endpoints</b>
          </span>
          <button type="button" onClick={() => openNav("Marketplace")}>Manage all</button>
        </div>
        {DESKTOP_SERVICES.slice(0, 3).map(([name, status, requests, revenue]) => (
          <button
            className={managedService === name ? "is-selected" : ""}
            key={name}
            type="button"
            onClick={() => {
              setManagedService(name);
              onAction(`${name} selected from overview`);
            }}
          >
            <span>{name}<small>{status}</small></span>
            <b>{requests}</b>
            <em>{revenue}</em>
          </button>
        ))}
      </article>

      <article className="dt-receipt-preview">
        <div>
          <b>Latest receipts</b>
          <button type="button" onClick={() => openNav("Receipts")}>All</button>
        </div>
        {DESKTOP_RECEIPTS.slice(0, 3).map(([name, agent, price]) => (
          <button
            className={selectedReceipt === name ? "is-selected" : ""}
            key={name}
            type="button"
            onClick={() => {
              setSelectedReceipt(name);
              onAction(`${name} receipt opened`);
            }}
          >
            <LogoMark />
            <span>{name}<small>{agent}</small></span>
            <b>{price}</b>
          </button>
        ))}
      </article>
    </section>
  );

  const renderServices = () => (
    <section className="dt-service-manager" data-testid="desktop-services-view">
      <div className="dt-page-intro">
        <small>My Services</small>
        <h3>Endpoints you sell to agents.</h3>
        <button type="button" onClick={() => onAction("New paid service draft created")}>New service</button>
      </div>
      <div className="dt-management-grid">
        {DESKTOP_SERVICES.map(([name, status, requests, revenue]) => (
          <article className={managedService === name ? "is-selected" : ""} key={name}>
            <LogoMark />
            <span>{status}</span>
            <h4>{name}</h4>
            <p>{requests} requests / 24h</p>
            <strong>{revenue}</strong>
            <div>
              <button
                type="button"
                onClick={() => {
                  setManagedService(name);
                  onAction(`${name} settings opened`);
                }}
              >
                Manage
              </button>
              <button type="button" onClick={() => onAction(`${name} status toggled`)}>
                {status === "active" ? "Pause" : "Resume"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );

  const renderMarketplace = () => (
    <>
      <section className="dt-desktop-hero" data-testid="desktop-marketplace-view">
        <small>{activeNav}</small>
        <h3>Paid endpoints, on tap.</h3>
        <p>Browse paid services, trigger 402, pay in stablecoin and unlock a real response.</p>
        <label>
          <Search size={16} />
          <input
            data-testid="desktop-search"
            placeholder="Search services, providers, networks..."
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
          />
        </label>
        {paidEndpoint ? (
          <div className="dt-desktop-receipt-mini" data-testid="desktop-paid-receipt">
            <Check size={15} />
            {paidEndpoint} response unlocked
          </div>
        ) : null}
      </section>

      <section className="dt-endpoint-grid">
        {filteredEndpoints.map(([name, tag, price]) => (
          <article className={paidEndpoint === name ? "is-paid" : ""} key={name}>
            <span>{tag}</span>
            <h4>{name}</h4>
            <p>by tollgate.dev</p>
            <b>{price}</b>
            <button
              data-testid={`pay-endpoint-${name}`}
              type="button"
              onClick={() => payEndpoint(name)}
            >
              {paidEndpoint === name ? "Paid" : "Try with agent"}
            </button>
          </article>
        ))}
      </section>
    </>
  );

  const renderAgents = () => (
    <section className="dt-agent-policies" data-testid="desktop-agents-view">
      <div className="dt-page-intro">
        <small>Agents and wallets</small>
        <h3>Budget policies.</h3>
        <button type="button" onClick={() => onAction("New agent wallet modal opened")}>New agent wallet</button>
      </div>
      <div className="dt-policy-grid">
        {DESKTOP_AGENTS.map(([name, spend, policy, status]) => (
          <button
            className={selectedAgent === name ? "is-selected" : ""}
            key={name}
            type="button"
            onClick={() => {
              setSelectedAgent(name);
              onAction(`${name} policy selected`);
            }}
          >
            <LogoMark />
            <h4>{name}</h4>
            <small>Daily spend</small>
            <b>{spend}</b>
            <span>Status <em>{status}</em></span>
            <span>Policy <em>{policy}</em></span>
          </button>
        ))}
      </div>
    </section>
  );

  const renderReceipts = () => (
    <section className="dt-receipt-board" data-testid="desktop-receipts-view">
      <div className="dt-page-intro">
        <small>Receipts</small>
        <h3>Verifiable x402 settlement.</h3>
        <button type="button" onClick={() => onAction("Receipts exported as CSV")}>Export CSV</button>
      </div>
      <div className="dt-receipt-list">
        {DESKTOP_RECEIPTS.map(([name, agent, price, time]) => (
          <article
            className={`${selectedReceipt === name ? "is-selected" : ""} ${
              verifiedReceipt === name ? "is-verified" : ""
            }`}
            key={name}
          >
            <button
              type="button"
              onClick={() => {
                setSelectedReceipt(name);
                onAction(`${name} receipt selected`);
              }}
            >
              <LogoMark />
              <span>{name}<small>{agent}</small></span>
              <b>{price}</b>
              <em>{time}</em>
            </button>
            <button
              type="button"
              onClick={() => {
                setVerifiedReceipt(name);
                onAction(`${name} receipt verified onchain`);
              }}
            >
              {verifiedReceipt === name ? "Verified" : "Verify"}
            </button>
          </article>
        ))}
      </div>
    </section>
  );

  const renderDesktopContent = () => {
    switch (activeNav) {
      case "Overview":
        return renderOverview();
      case "My Services":
        return renderServices();
      case "Marketplace":
        return renderMarketplace();
      case "Agents":
        return renderAgents();
      case "Receipts":
        return renderReceipts();
    }
  };

  return (
    <section className="dt-browser">
      <div className="dt-browser__bar">
        <span><i /><i /><i /></span>
        <b>tollgate.local</b>
        <em />
      </div>
      <div className="dt-desktop-app">
        <aside className="dt-desktop-side">
          <div className="dt-side-logo"><LogoMark /> TollGate</div>
          {DESKTOP_NAV_ITEMS.map(([label, Icon]) => (
            <button
              className={activeNav === label ? "is-active" : ""}
              data-testid={`desktop-nav-${label}`}
              key={label}
              type="button"
              onClick={() => openNav(label)}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
          <button className="dt-side-settings" type="button" onClick={() => onAction("Settings opened")}>
            <Settings size={16} />
            Settings
          </button>
        </aside>

        <main className="dt-desktop-main">
          <div className="dt-desktop-top">
            <div>
              <small>{activeNav}</small>
              <h2>Welcome back, builder.</h2>
            </div>
            <span>Gateway online - {paidCount.toLocaleString()} paid</span>
          </div>

          {renderDesktopContent()}
        </main>
      </div>
    </section>
  );
}

function MiniPhone({
  children,
  label,
  tilted,
}: {
  children: React.ReactNode;
  label: string;
  tilted?: "left" | "right";
}) {
  return (
    <div className={`dt-mini-phone ${tilted ? `dt-mini-phone--${tilted}` : ""}`}>
      <div className="dt-mini-phone__screen">
        <div className="dt-mini-phone__top">
          <span>{label}</span>
          <Search size={14} />
        </div>
        {children}
      </div>
    </div>
  );
}

function MobilePay({ onAction }: { onAction: ActionReporter }) {
  const [selectedTx, setSelectedTx] = useState("QIE Gateway");
  const [mode, setMode] = useState("Pay");
  const [amount, setAmount] = useState("2101.70");
  const [sent, setSent] = useState(false);

  const tapNumber = (value: string) => {
    setSent(false);
    setAmount((current) => (current === "2101.70" ? value : `${current}${value}`).slice(0, 8));
  };

  const sendPayment = () => {
    setSent(true);
    onAction(`${mode} sent: $${amount}`);
  };

  return (
    <section className="dt-mobile-stage">
      <MiniPhone label="Transactions" tilted="left">
        <div className="dt-card-chip">**** 2872</div>
        {[
          ["QIE Gateway", "+$714.00", "received"],
          ["RiskLens", "+$428.00", "received"],
          ["0G Storage", "-$124.55", "paid"],
          ["Tax Classifier", "-$328.96", "paid"],
          ["Frontier Intel", "+$548.00", "received"],
        ].map(([name, amount, sub]) => (
          <button
            className={`dt-tx-row ${selectedTx === name ? "is-selected" : ""}`}
            key={name}
            type="button"
            onClick={() => {
              setSelectedTx(name);
              onAction(`${name} transaction selected`);
            }}
          >
            <span />
            <b>{name}</b>
            <small>{sub}</small>
            <em>{amount}</em>
          </button>
        ))}
      </MiniPhone>

      <MiniPhone label="Hi, Leandro!">
        <div className="dt-balance-card">
          <small>USDC</small>
          <strong>$26,887.09</strong>
          <em>+$421.03</em>
        </div>
        <div className="dt-pay-actions">
          {["Pay", "Transfer", "Receive"].map((item) => (
            <button
              className={mode === item ? "is-active" : ""}
              key={item}
              type="button"
              onClick={() => {
                setMode(item);
                onAction(`${item} mode selected`);
              }}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="dt-currency-grid">
          <span>Euro <b>0.97</b></span>
          <span>QIE <b>0.82</b></span>
          <button type="button" onClick={() => onAction("Add currency drawer opened")}>
            + Add
          </button>
        </div>
      </MiniPhone>

      <MiniPhone label="Pay" tilted="right">
        <div className="dt-pay-card">
          <span>TollGate **** 1720</span>
          <strong>${Number(amount || "0").toLocaleString("en-US")}</strong>
          <small>Balance: $126,887.09</small>
        </div>
        <div className="dt-keypad">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"].map((n) => (
            <button key={n} type="button" onClick={() => tapNumber(n)}>{n}</button>
          ))}
          <button type="button" onClick={() => setAmount((current) => current.slice(0, -1) || "0")}>
            Del
          </button>
        </div>
        <button className={`dt-send ${sent ? "is-sent" : ""}`} type="button" onClick={sendPayment}>
          {sent ? "Sent" : mode}
        </button>
      </MiniPhone>
    </section>
  );
}

function SwapFlow({ onAction }: { onAction: ActionReporter }) {
  const [flipped, setFlipped] = useState(false);
  const [swapped, setSwapped] = useState(false);
  const payToken = flipped ? "QIE" : "USDC";
  const receiveToken = flipped ? "USDC" : "QIE";

  const flipTokens = () => {
    setFlipped((current) => !current);
    setSwapped(false);
    onAction("Swap direction flipped");
  };

  const slideSwap = () => {
    setSwapped(true);
    onAction(`${payToken} swapped to ${receiveToken}`);
  };

  return (
    <section className="dt-swap-stage">
      <div className="dt-swap-preview">
        <MiniPhone label="Swap" tilted="left">
          <SwapCard compact flipped={flipped} onFlip={flipTokens} />
        </MiniPhone>
        <div className="dt-swap-big">
          <div className="dt-swap-device">
            <div className="dt-swap-dynamic" />
            <div className="dt-swap-head">
              <span><LogoMark /> 0xfK07...8336</span>
              <CreditCard size={19} />
            </div>
            <h3>Swap</h3>
            <SwapCard flipped={flipped} onFlip={flipTokens} />
            <p className="dt-swap-status">
              {swapped ? "Swap settled, receipt ready" : "Tap center icon to flip tokens"}
            </p>
            <button className={`dt-slide-swap ${swapped ? "is-swapped" : ""}`} type="button" onClick={slideSwap}>
              <Check size={18} />
              {swapped ? "Swap Complete" : "Slide to Swap"}
              <span>&gt;&gt;&gt;</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function SwapCard({
  compact = false,
  flipped,
  onFlip,
}: {
  compact?: boolean;
  flipped: boolean;
  onFlip: () => void;
}) {
  const payToken = flipped ? "QIE" : "USDC";
  const receiveToken = flipped ? "USDC" : "QIE";

  return (
    <div className={`dt-swap-card ${compact ? "dt-swap-card--compact" : ""}`}>
      <div className="dt-swap-box">
        <small>You Pay <b>52.34 {payToken}</b></small>
        <div>
          <span>{payToken} <ChevronDown size={15} /></span>
          <strong>{flipped ? "6.7345" : "0.01"}</strong>
        </div>
      </div>
      <button className="dt-swap-middle" type="button" onClick={onFlip}>
        <Shuffle size={18} />
      </button>
      <div className="dt-swap-box">
        <small>You Receive <b>187.52 {receiveToken}</b></small>
        <div>
          <span>{receiveToken} <ChevronDown size={15} /></span>
          <strong>{flipped ? "0.01" : "6.7345108344"}</strong>
        </div>
      </div>
      <p>Fee: 0.255851 {payToken}</p>
    </div>
  );
}

function TweaksCard({
  tweaks,
  onChange,
}: {
  tweaks: LabTweaks;
  onChange: (next: LabTweaks) => void;
}) {
  return (
    <aside className="dt-tweaks">
      <div>
        <SlidersHorizontal size={17} />
        <b>Tweaks</b>
      </div>

      <label>
        Accent
        <span className="dt-accent-row">
          {ACCENTS.map((accent) => (
            <button
              aria-label={accent}
              className={tweaks.accent === accent ? "is-active" : ""}
              key={accent}
              style={{ background: accent }}
              type="button"
              onClick={() => onChange({ ...tweaks, accent })}
            />
          ))}
        </span>
      </label>

      <label>
        Radius
        <input
          max={46}
          min={16}
          type="range"
          value={tweaks.radius}
          onChange={(event) =>
            onChange({ ...tweaks, radius: Number(event.currentTarget.value) })
          }
        />
      </label>

      <button
        className="dt-toggle-row"
        type="button"
        onClick={() => onChange({ ...tweaks, dark: !tweaks.dark })}
      >
        Dark canvas
        <span data-on={tweaks.dark ? "1" : "0"}><i /></span>
      </button>

      <button
        className="dt-toggle-row"
        type="button"
        onClick={() =>
          onChange({
            ...tweaks,
            density: tweaks.density === "soft" ? "tight" : "soft",
          })
        }
      >
        Tight density
        <span data-on={tweaks.density === "tight" ? "1" : "0"}><i /></span>
      </button>
    </aside>
  );
}

export function DesignTweaksLab({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<LabTab>("invoice");
  const [tweaks, setTweaks] = useState<LabTweaks>(readTweaks);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tweaks));
  }, [tweaks]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 2200);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const reportAction: ActionReporter = (message) => setNotice(message);

  const style = useMemo(
    () =>
      ({
        "--dt-accent": tweaks.accent,
        "--dt-radius": `${tweaks.radius}px`,
      }) as React.CSSProperties,
    [tweaks],
  );

  const renderTab = (id: LabTab) => {
    switch (id) {
      case "invoice":
        return <InvoicePhone onAction={reportAction} />;
      case "brand":
        return (
          <BrandKit
            onAction={reportAction}
            onAccentChange={(accent) => setTweaks((current) => ({ ...current, accent }))}
          />
        );
      case "desktop":
        return <DesktopApp onAction={reportAction} />;
      case "mobile":
        return <MobilePay onAction={reportAction} />;
      case "swap":
        return <SwapFlow onAction={reportAction} />;
      case "all":
        return (
          <div className="dt-all-grid">
            <InvoicePhone onAction={reportAction} />
            <BrandKit
              onAction={reportAction}
              onAccentChange={(accent) => setTweaks((current) => ({ ...current, accent }))}
            />
            <DesktopApp onAction={reportAction} />
            <MobilePay onAction={reportAction} />
            <SwapFlow onAction={reportAction} />
          </div>
        );
    }
  };

  return (
    <main
      className={`dt-lab ${tweaks.dark ? "is-dark" : ""} ${
        tweaks.density === "tight" ? "is-tight" : ""
      }`}
      style={style}
    >
      <div className="dt-shell">
        <header className="dt-header">
          <button className="dt-back" type="button" onClick={onBack}>
            <ArrowLeft size={17} />
            Back
          </button>
          <div>
            <LogoMark />
            <span>
              <b>TollGate References</b>
              <small>Invoice, brand, desktop and mobile UI playground</small>
            </span>
          </div>
          <button className="dt-close" type="button" onClick={onBack} aria-label="Close">
            <X size={18} />
          </button>
        </header>

        <nav className="dt-tabs" aria-label="Reference tabs">
          {TABS.map((item) => (
            <button
              className={tab === item.id ? "is-active" : ""}
              data-testid={`tweaks-tab-${item.id}`}
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <section className="dt-content">{renderTab(tab)}</section>
      </div>

      <TweaksCard tweaks={tweaks} onChange={setTweaks} />
      {notice ? (
        <div className="dt-action-toast" data-testid="action-toast">
          <Check size={16} />
          {notice}
        </div>
      ) : null}
    </main>
  );
}
