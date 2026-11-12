import { Interface } from "ethers";

export const MULTICALL3_ADDRESS = "0xcA11bde05977b3631167028862bE2a173976CA11";

const MULTICALL3_ABI = [
  "function aggregate3(tuple(address target, bool allowFailure, bytes callData)[] calls) payable returns (tuple(bool success, bytes returnData)[])"
];

export interface BatchCall {
  target: string;
  allowFailure: boolean;
  callData: string;
}

export class MulticallBatcher {
  private iface: Interface;

  constructor() {
    this.iface = new Interface(MULTICALL3_ABI);
  }

  public encodeAggregate(calls: BatchCall[]): string {
    return this.iface.encodeFunctionData("aggregate3", [calls]);
  }
}