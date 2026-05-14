/**
 * QieWalletConnectPanel — real MetaMask connect for QIE testnet (chainId 0x7BF / 1983).
 * Fulfills the "QIE Wallet auth" hard gate required for submission.
 *
 * Flow:
 *   1. Click "Connect QIE Wallet" → eth_requestAccounts
 *   2. wallet_switchEthereumChain to 0x7BF; if unknown, wallet_addEthereumChain
 *   3. Show address, native QIE balance, contract status
 */
import { useState, useEffect, useCallback } from "react";
import { Wallet, Link as LinkIco, RefreshCw, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { getQieConfig, qieExplorerAddrUrl, QIE_DEFAULT_CHAIN_HEX } from "../../../lib/qie";

type ConnState = "disconnected" | "connecting" | "connected" | "wrong_chain";

const QIE_ADD_CHAIN = {
  chainId: QIE_DEFAULT_CHAIN_HEX,
  chainName: "QIE Testnet",
  nativeCurrency: { name: "QIE", symbol: "QIE", decimals: 18 },
  rpcUrls: ["https://rpc1testnet.qie.digital/"],
  blockExplorerUrls: ["https://testnet.qie.digital"],
};

type Eip1193 = { request: (a: { method: string; params?: unknown[] }) => Promise<unknown>; on?: (e: string, h: (...a: unknown[]) => void) => void; removeListener?: (e: string, h: (...a: unknown[]) => void) => void };
function getEth(): Eip1193 | null {
  return (typeof window !== "undefined" ? (window as unknown as { ethereum?: Eip1193 }).ethereum : undefined) ?? null;
}

function shortAddr(addr: string) { return `${addr.slice(0, 6)}…${addr.slice(-4)}`; }

async function readBalance(eth: Eip1193, addr: string): Promise<string> {
  try {
    const raw = (await eth.request({ method: "eth_getBalance", params: [addr, "latest"] })) as string;
    const wei = BigInt(raw);
    const qie = Number(wei) / 1e18;
    return qie.toFixed(4) + " QIE";
  } catch { return "—"; }
}

export function QieWalletConnectPanel() {
  const [state, setState] = useState<ConnState>("disconnected");
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string>("—");
  const [err, setErr] = useState<string | null>(null);
  const cfg = getQieConfig();

  const refreshBalance = useCallback(async (addr: string) => {
    const eth = getEth();
    if (!eth || !addr) return;
    setBalance(await readBalance(eth, addr));
  }, []);

  // Auto-detect already-connected wallet
  useEffect(() => {
    const eth = getEth();
    if (!eth) return;
    eth.request({ method: "eth_accounts" }).then((accs) => {
      const accounts = accs as string[];
      if (accounts.length > 0) {
        const addr = accounts[0]!;
        setAddress(addr);
        eth.request({ method: "eth_chainId" }).then((cid) => {
          const chain = (cid as string).toLowerCase();
          if (chain === QIE_DEFAULT_CHAIN_HEX) {
            setState("connected");
            refreshBalance(addr);
          } else {
            setState("wrong_chain");
          }
        }).catch(() => {});
      }
    }).catch(() => {});
  }, [refreshBalance]);

  async function connect() {
    const eth = getEth();
    if (!eth) { setErr("MetaMask not found — install MetaMask and reload."); return; }
    setState("connecting"); setErr(null);
    try {
      const accs = (await eth.request({ method: "eth_requestAccounts" })) as string[];
      const addr = accs[0] ?? null;
      setAddress(addr);
      try {
        await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: QIE_DEFAULT_CHAIN_HEX }] });
      } catch (switchErr) {
        if ((switchErr as { code?: number }).code === 4902) {
          await eth.request({ method: "wallet_addEthereumChain", params: [QIE_ADD_CHAIN] });
        } else throw switchErr;
      }
      setState("connected");
      if (addr) await refreshBalance(addr);
    } catch (e) {
      setErr((e as Error).message ?? "Connection failed");
      setState("disconnected");
    }
  }

  async function switchChain() {
    const eth = getEth();
    if (!eth) return;
    try {
      await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: QIE_DEFAULT_CHAIN_HEX }] });
      setState("connected");
      if (address) await refreshBalance(address);
    } catch (e) {
      setErr((e as Error).message ?? "Switch failed");
    }
  }

  const isConnected = state === "connected";
  const isWrong = state === "wrong_chain";

  return (
    <div className="panel block svc-flavor" style={{ marginBottom: 14 }}>
      <div className="block-head">
        <div className="ttl">
          <span className="sq soft"><Wallet width={15} height={15} /></span>
          <div>
            <h3>QIE Wallet Connect</h3>
            <div className="sub">Connect MetaMask to QIE Testnet (chainId 1983) · required for submission</div>
          </div>
        </div>
        {isConnected && (
          <button className="btn btn-ghost btn-sm" type="button" onClick={() => address && refreshBalance(address)}>
            <RefreshCw width={12} height={12} />
          </button>
        )}
      </div>

      <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Status strip */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {state === "connecting" && <Loader2 width={14} height={14} className="wallet-spin" style={{ color: "#4DA2FF" }} />}
          {isConnected && <CheckCircle width={14} height={14} style={{ color: "var(--green)" }} />}
          {(state === "disconnected" || isWrong) && <AlertCircle width={14} height={14} style={{ color: isWrong ? "#f59e0b" : "var(--muted)" }} />}
          <span style={{ fontSize: ".78rem", fontWeight: 700, color: isConnected ? "var(--green)" : isWrong ? "#f59e0b" : "var(--muted)" }}>
            {state === "disconnected" && "Not connected"}
            {state === "connecting" && "Connecting…"}
            {isConnected && "Connected to QIE Testnet"}
            {isWrong && "Wrong network — switch to QIE Testnet"}
          </span>
        </div>

        {/* Connected address + balance */}
        {address && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div style={{ background: "var(--bg-3)", borderRadius: 9, padding: "8px 12px" }}>
              <div style={{ fontSize: ".58rem", textTransform: "uppercase", letterSpacing: ".07em", color: "var(--muted)", fontWeight: 800, marginBottom: 3 }}>Address</div>
              <div style={{ fontFamily: "monospace", fontSize: ".73rem", fontWeight: 700 }}>{shortAddr(address)}</div>
              <a href={qieExplorerAddrUrl(address)} target="_blank" rel="noreferrer"
                style={{ fontSize: ".6rem", color: "#00C389", display: "inline-flex", alignItems: "center", gap: 3, marginTop: 3 }}>
                <LinkIco width={10} height={10} /> Explorer ↗
              </a>
            </div>
            <div style={{ background: "var(--bg-3)", borderRadius: 9, padding: "8px 12px" }}>
              <div style={{ fontSize: ".58rem", textTransform: "uppercase", letterSpacing: ".07em", color: "var(--muted)", fontWeight: 800, marginBottom: 3 }}>Balance</div>
              <div style={{ fontSize: ".82rem", fontWeight: 800, color: isConnected ? "var(--ink)" : "var(--muted)" }}>{balance}</div>
              <div style={{ fontSize: ".6rem", color: "var(--muted)", marginTop: 2 }}>native QIE</div>
            </div>
          </div>
        )}

        {/* Deployed contracts */}
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {[
            { label: "QieCheckout.sol", addr: cfg.checkoutAddress, envKey: "VITE_QIE_CHECKOUT_ADDRESS" },
            { label: "QiePass.sol", addr: cfg.passAddress, envKey: "VITE_QIE_PASS_ADDRESS" },
          ].map((c) => (
            <div key={c.label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: ".72rem" }}>
              {c.addr
                ? <CheckCircle width={11} height={11} style={{ color: "var(--green)", flexShrink: 0 }} />
                : <AlertCircle width={11} height={11} style={{ color: "var(--muted)", flexShrink: 0 }} />}
              <span style={{ fontWeight: 700, color: c.addr ? "var(--ink)" : "var(--muted)" }}>{c.label}</span>
              {c.addr ? (
                <a href={qieExplorerAddrUrl(c.addr)} target="_blank" rel="noreferrer"
                  style={{ fontFamily: "monospace", fontSize: ".62rem", color: "#00C389" }}>
                  {c.addr.slice(0, 10)}…
                </a>
              ) : (
                <span style={{ color: "var(--muted)", fontFamily: "monospace", fontSize: ".62rem" }}>set {c.envKey}</span>
              )}
            </div>
          ))}
        </div>

        {err && (
          <div style={{ fontSize: ".72rem", color: "#f87171", padding: "6px 10px", background: "#f8717114", borderRadius: 7 }}>{err}</div>
        )}

        {!isConnected && (
          <button className="btn btn-acc btn-sm" type="button" onClick={isWrong ? switchChain : connect}
            disabled={state === "connecting"} style={{ alignSelf: "flex-start" }}>
            {state === "connecting" && <Loader2 width={12} height={12} className="wallet-spin" />}
            {isWrong ? "Switch to QIE Testnet" : "Connect QIE Wallet"}
          </button>
        )}
      </div>
    </div>
  );
}
