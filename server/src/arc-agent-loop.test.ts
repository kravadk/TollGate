import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { startArcAgentScheduler } from "./arc-agent-loop.js";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("Arc agent scheduler", () => {
  it("runs immediately and continues on its interval", async () => {
    let runs = 0;
    const stop = startArcAgentScheduler({
      intervalMs: 20,
      run: async () => {
        runs += 1;
      },
    });

    await sleep(55);
    stop();

    assert.ok(runs >= 2);
  });
});
