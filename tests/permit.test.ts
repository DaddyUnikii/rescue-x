import { describe, it, expect } from "vitest";
import { Wallet } from "ethers";
import { PermitRescuer } from "../src/modules/permit.js";
import { StakingRescuer } from "../src/modules/staking.js";

describe("PermitRescuer", () => {
  const permit = new PermitRescuer();
  const owner = "0x1111111111111111111111111111111111111111";
  const spender = "0x2222222222222222222222222222222222222222";

  it("should encode permit function call correctly", () => {
    const dummySig = {
      v: 27,
      r: "0x1111111111111111111111111111111111111111111111111111111111111111",
      s: "0x2222222222222222222222222222222222222222222222222222222222222222",
      deadline: 1700000000n,
      value: 1000000000000000000n
    };

    const calldata = permit.encodePermit(owner, spender, dummySig);
    expect(calldata.startsWith("0xd505accf")).toBe(true);
  });

  it("should sign EIP-2612 typed data with custom domain version and split v/r/s accurately", async () => {
    const victim = new Wallet("0x0123456789012345678901234567890123456789012345678901234567890123");
    const sig = await permit.signPermit(
      victim,
      "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      "USD Coin",
      1,
      spender,
      5000000n,
      0n,
      3600,
      "2"
    );

    expect(sig.v === 27 || sig.v === 28).toBe(true);
    expect(sig.r.length).toBe(66);
    expect(sig.s.length).toBe(66);
    expect(sig.version).toBe("2");
  });
});

describe("StakingRescuer", () => {
  const staking = new StakingRescuer();

  it("should encode emergencyWithdraw correctly", () => {
    const calldata = staking.encodeEmergencyWithdraw(1n);
    expect(calldata.startsWith("0x5312ea8e")).toBe(true);
  });

  it("should encode getReward correctly", () => {
    const calldata = staking.encodeGetReward();
    expect(calldata.startsWith("0x3d18b912")).toBe(true);
  });
});
