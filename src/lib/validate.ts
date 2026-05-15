export const isEthAddr = (v: string): boolean => /^0x[0-9a-fA-F]{40}$/.test(v);

export const isTxHash = (v: string): boolean => /^0x[0-9a-fA-F]{64}$/.test(v);

export const safeAmt = (v: string | number, max = 1_000_000): number | null => {
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) && n > 0 && n <= max ? n : null;
};

export const safeUrl = (v: string): string | null => {
  try {
    const u = new URL(v);
    return ["http:", "https:"].includes(u.protocol) ? u.href : null;
  } catch {
    return null;
  }
};
