import { describe, it, expect } from "vitest";
import { PermitRescuer } from "../src/modules/permit.js";
import { StakingRescuer } from "../src/modules/staking.ts";

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