import { Interface } from "ethers";

const STAKING_ABI = [
  "function withdraw(uint256 pid, uint256 amount)",
  "function emergencyWithdraw(uint256 pid)",
  "function getReward()",
  "function claim(uint256 index, address account, uint256 amount, bytes32[] merkleProof)",
  "function release(address token, address beneficiary)"
];

export class StakingRescuer {
  private iface: Interface;

  constructor() {
    this.iface = new Interface(STAKING_ABI);
  }

  public encodeEmergencyWithdraw(pid: number | bigint): string {
    return this.iface.encodeFunctionData("emergencyWithdraw", [pid]);
  }

  public encodeGetReward(): string {
    return this.iface.encodeFunctionData("getReward", []);
  }

  public encodeMerkleClaim(
    index: number | bigint,
    account: string,
    amount: bigint,
    proof: string[]
  ): string {
    return this.iface.encodeFunctionData("claim", [index, account, amount, proof]);
  }

  public encodeVestingRelease(tokenAddress: string, beneficiary: string): string {
    return this.iface.encodeFunctionData("release", [tokenAddress, beneficiary]);
  }
}