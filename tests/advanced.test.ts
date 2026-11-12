import { describe, it, expect } from "vitest";
import { MulticallBatcher } from "../src/modules/multicall.js";
import { MemoryScrubber } from "../src/security/scrubber.js";
import { WebhookNotifier } from "../src/core/notifier.js";
import { PlanExporter } from "../src/cli/exporter.js";
import { RescuePlan } from "../src/types/index.js";

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

describe("PlanExporter", () => {
  it("should encrypt and decrypt RescuePlan containing BigInt fields via AES-256-GCM", () => {
    const plan: RescuePlan = {
      chainId: 56,
      victim: "0x1111111111111111111111111111111111111111",
      sponsor: "0x2222222222222222222222222222222222222222",
      recipient: "0x3333333333333333333333333333333333333333",
      assets: [
        { type: "ERC20", contractAddress: "0x55d398326f99059fF775485246999027B3197955", amount: "1000000000000000000" }
      ],
      usePrivateMempool: true,
      estimatedGasTotal: 150000n,
      priorityFeeGwei: 3
    };

    const encrypted = PlanExporter.encryptPlan(plan, "strong-passphrase-123");
    const decrypted = PlanExporter.decryptPlan(encrypted, "strong-passphrase-123");

    expect(decrypted.chainId).toBe(56);
    expect(decrypted.estimatedGasTotal).toBe(150000n);
    expect(decrypted.assets[0].amount).toBe("1000000000000000000");
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
