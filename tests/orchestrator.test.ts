import { describe, it, expect } from "vitest";
import { RescueOrchestrator } from "../src/core/orchestrator.js";

describe("RescueOrchestrator", () => {
  it("should initialize with supported chain id", () => {
    const orchestrator = new RescueOrchestrator(56);
    expect(orchestrator).toBeDefined();
  });

  it("should handle empty token list gracefully", async () => {
    const orchestrator = new RescueOrchestrator(56);
    const discovered = await orchestrator.diagnose("0x000000000000000000000000000000000000dEaD", []);
    expect(discovered).toEqual([]);
  });
});