import { describe, it, expect } from "vitest";
import { MulticallBatcher } from "../src/modules/multicall.js";
import { MemoryScrubber } from "../src/security/scrubber.js";
import { WebhookNotifier } from "../src/core/notifier.js";

describe("MulticallBatcher", () => {
  it("should encode aggregate3 call data correctly", () => {
    const batcher = new MulticallBatcher();
    const calldata = batcher.encodeAggregate([
      { target: "0x1111111111111111111111111111111111111111", allowFailure: true, callData: "0x" }
    ]);
    expect(calldata.startsWith("0x82ad56cb")).toBe(true);
  });
});

describe("MemoryScrubber", () => {
  it("should sanitize receipt fields", () => {
    const raw = { victim: "0xabc", privateKey: "0x123", seedPhrase: "word" };
    const clean = MemoryScrubber.sanitizeReceipt(raw);
    expect((clean as any).privateKey).toBeUndefined();
    expect((clean as any).seedPhrase).toBeUndefined();
  });
});

describe("WebhookNotifier", () => {
  it("should format telegram text cleanly", () => {
    const text = WebhookNotifier.formatTelegramAlert({
      success: true,
      transactions: ["0xtx"],
      rescuedAssets: [],
      blockNumber: 123456,
      timestamp: Date.now(),
      gasSpentNative: "0.001"
    });
    expect(text.includes("SUCCESS")).toBe(true);
  });
});