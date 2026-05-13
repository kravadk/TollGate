import { describe, it, expect } from "vitest";

// ── AgentScore formula (mirrors AgentScoreBadge.tsx) ─────────────────────────

function computeScore(receiptCount: number, volumeUsd: number): number {
  const base = Math.min(receiptCount * 5, 500);
  const vol  = Math.min(volumeUsd, 300);
  return Math.round(base + vol);
}

function tier(score: number): string {
  if (score >= 850) return "Platinum";
  if (score >= 700) return "Gold";
  if (score >= 400) return "Silver";
  return "Bronze";
}

describe("AgentScore formula", () => {
  it("zero receipts → score 0, Bronze", () => {
    expect(computeScore(0, 0)).toBe(0);
    expect(tier(0)).toBe("Bronze");
  });

  it("100 receipts, $50 vol → 550, Silver", () => {
    expect(computeScore(100, 50)).toBe(550);
    expect(tier(550)).toBe("Silver");
  });

  it("caps at 500 + 300 = 800, Gold", () => {
    expect(computeScore(200, 500)).toBe(800);
    expect(tier(800)).toBe("Gold");
  });

  it("Platinum threshold", () => {
    expect(tier(849)).toBe("Gold");
    expect(tier(850)).toBe("Platinum");
  });

  it("volume capped at 300", () => {
    expect(computeScore(0, 999)).toBe(300);
    expect(computeScore(0, 301)).toBe(300);
  });

  it("receipt count capped at 500 base", () => {
    expect(computeScore(100, 0)).toBe(500);
    expect(computeScore(200, 0)).toBe(500);
  });
});

// ── Payment price validation ──────────────────────────────────────────────────

function validatePrice(price: number): boolean {
  return Number.isFinite(price) && price >= 0 && price <= 10_000;
}

describe("Payment price validation", () => {
  it("accepts valid prices", () => {
    expect(validatePrice(0)).toBe(true);
    expect(validatePrice(0.05)).toBe(true);
    expect(validatePrice(10_000)).toBe(true);
  });

  it("rejects invalid prices", () => {
    expect(validatePrice(-1)).toBe(false);
    expect(validatePrice(10_001)).toBe(false);
    expect(validatePrice(NaN)).toBe(false);
    expect(validatePrice(Infinity)).toBe(false);
  });
});

// ── Service ID validation (mirrors DiscoveryWidget) ──────────────────────────

function isValidServiceId(id: string): boolean {
  return /^[a-z0-9_]{3,64}$/i.test(id);
}

describe("Service ID validation", () => {
  it("accepts valid IDs", () => {
    expect(isValidServiceId("svc_foo")).toBe(true);
    expect(isValidServiceId("abc")).toBe(true);
    expect(isValidServiceId("MY_API_123")).toBe(true);
  });

  it("rejects invalid IDs", () => {
    expect(isValidServiceId("ab")).toBe(false);
    expect(isValidServiceId("my-api")).toBe(false);
    expect(isValidServiceId("")).toBe(false);
    expect(isValidServiceId("a".repeat(65))).toBe(false);
  });
});

// ── EVM address validation ────────────────────────────────────────────────────

function isEvmAddress(s: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(s);
}

describe("EVM address validation", () => {
  it("accepts valid addresses", () => {
    expect(isEvmAddress("0xA8FdDb9F6f54Fbf127cb8c71049cB1e19f5836F9")).toBe(true);
    expect(isEvmAddress("0x" + "0".repeat(40))).toBe(true);
  });

  it("rejects invalid addresses", () => {
    expect(isEvmAddress("0xABC")).toBe(false);
    expect(isEvmAddress("A8FdDb9F6f54Fbf127cb8c71049cB1e19f5836F9")).toBe(false);
  });
});

// ── AgentCreditLine limit formula ────────────────────────────────────────────

function creditLimitFor(score: number): number {
  return Math.round((score / 1000) * 10 * 100) / 100;
}

describe("AgentCreditLine limit formula", () => {
  it("score 0 → $0 limit", () => expect(creditLimitFor(0)).toBe(0));
  it("score 1000 → $10 limit", () => expect(creditLimitFor(1000)).toBe(10));
  it("score 500 → $5 limit", () => expect(creditLimitFor(500)).toBe(5));
  it("score 800 → $8 limit", () => expect(creditLimitFor(800)).toBe(8));
});
