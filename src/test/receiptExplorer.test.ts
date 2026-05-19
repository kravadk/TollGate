import { describe, expect, it } from "vitest";
import { explorerTxForNetwork } from "../lib/chains";

describe("Receipt explorer routing", () => {
  it("routes arc-testnet receipts to ArcScan, not 0G ChainScan", () => {
    expect(explorerTxForNetwork("arc-testnet", "0xabc")).toBe("https://testnet.arcscan.app/tx/0xabc");
  });

  it("routes 0G Galileo receipts to Galileo ChainScan", () => {
    expect(explorerTxForNetwork("0g-galileo", "0xabc")).toBe("https://chainscan-galileo.0g.ai/tx/0xabc");
  });
});
