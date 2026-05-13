import type { ReceiptStatus } from "../types";

export const fmtUsd = (n: number) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function hashPct(seed: string, lo = 1.2, hi = 8.4) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return lo + ((h % 1000) / 1000) * (hi - lo);
}

export function fnvHex(seed: string, len = 8) {
  let h = 0x811c9dc5 >>> 0;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = (h * 0x01000193) >>> 0; }
  return (h.toString(16) + "0".repeat(len)).slice(0, len);
}

export function ago(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 45) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function badgeFor(status: ReceiptStatus | "active" | "paused") {
  return <span className={`badge ${status}`}><span className="b-dot" />{status}</span>;
}
