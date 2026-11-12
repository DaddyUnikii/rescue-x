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

  it("should build evacuation transaction with explicit victim from address for ERC20, ERC721, and ERC1155", () => {
    const orchestrator = new RescueOrchestrator(1);
    const victim = "0x1111111111111111111111111111111111111111";
    const recipient = "0x2222222222222222222222222222222222222222";

    const erc20Tx = orchestrator.encodeAssetEvacuationTx(
      { type: "ERC20", contractAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", amount: "1000" },
      victim,
      recipient
    );
    expect(erc20Tx.from).toBe(victim);
    expect(String(erc20Tx.data).startsWith("0xa9059cbb")).toBe(true);

    const nftTx = orchestrator.encodeAssetEvacuationTx(
      { type: "ERC721", contractAddress: "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D", tokenId: "99" },
      victim,
      recipient
    );
    expect(nftTx.from).toBe(victim);
    expect(String(nftTx.data).startsWith("0x42842e0e")).toBe(true);

    const erc1155Tx = orchestrator.encodeAssetEvacuationTx(
      { type: "ERC1155", contractAddress: "0x3333333333333333333333333333333333333333", tokenId: "7", amount: "5" },
      victim,
      recipient
    );
    expect(erc1155Tx.from).toBe(victim);
    expect(String(erc1155Tx.data).startsWith("0xf242432a")).toBe(true);
  });
});
