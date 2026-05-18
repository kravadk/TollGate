import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildArcSignalSourceRadar } from "./arc-signal-sources.js";

describe("Arc signal source radar", () => {
  it("does not mark Apify sources live when the token is missing", () => {
    const radar = buildArcSignalSourceRadar({ ARC_SIGNAL_SOURCE_MODE: "live" });

    assert.ok(radar.summary.needsKey > 0);
    assert.equal(radar.summary.configured, 0);
    assert.ok(radar.missing.includes("APIFY_TOKEN"));
    assert.equal(radar.sources.find((source) => source.id === "bloomberg-paywall-bypass")?.status, "blocked");
  });

  it("marks provider-backed sources configured when live mode and token are present", () => {
    const radar = buildArcSignalSourceRadar({
      ARC_SIGNAL_SOURCE_MODE: "live",
      APIFY_TOKEN: "configured-secret",
    });

    assert.ok(radar.summary.configured > 0);
    assert.equal(radar.summary.needsKey, 0);
    assert.equal(radar.sources.find((source) => source.id === "reddit-trends")?.status, "configured");
    assert.equal(radar.sources.find((source) => source.id === "bloomberg-paywall-bypass")?.status, "blocked");
  });

  it("keeps configured tokens in watchlist mode until explicitly enabled", () => {
    const radar = buildArcSignalSourceRadar({
      ARC_SIGNAL_SOURCE_MODE: "watchlist",
      APIFY_TOKEN: "configured-secret",
    });

    assert.equal(radar.summary.configured, 0);
    assert.ok(radar.summary.watchlist > 0);
    assert.ok(radar.missing.includes("ARC_SIGNAL_SOURCE_MODE=live"));
  });
});
