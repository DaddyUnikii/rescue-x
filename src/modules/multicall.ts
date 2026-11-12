import { Contract, Interface, JsonRpcProvider } from "ethers";

export const MULTICALL3_ADDRESS = "0xcA11bde05977b3631167028862bE2a173976CA11";

const MULTICALL3_ABI = [
  "function aggregate3(tuple(address target, bool allowFailure, bytes callData)[] calls) payable returns (tuple(bool success, bytes returnData)[])"
];

export interface BatchCall {
  target: string;
  allowFailure: boolean;
  callData: string;
}

export interface BatchResult {
  success: boolean;
  returnData: string;
}

export class MulticallBatcher {
  private iface: Interface;

  constructor() {
    this.iface = new Interface(MULTICALL3_ABI);
  }

  public encodeAggregate(calls: BatchCall[]): string {
    return this.iface.encodeFunctionData("aggregate3", [calls]);
  }

  public decodeAggregate(returnData: string): BatchResult[] {
    const [results] = this.iface.decodeFunctionResult("aggregate3", returnData);
    return (results as Array<{ success: boolean; returnData: string }>).map((r) => ({
      success: Boolean(r.success),
      returnData: r.returnData
    }));
  }

  public async executeReadBatch(calls: BatchCall[], provider: JsonRpcProvider): Promise<BatchResult[]> {
    if (calls.length === 0) return [];
    const contract = new Contract(MULTICALL3_ADDRESS, MULTICALL3_ABI, provider);
    const raw = (await contract.aggregate3.staticCall(calls)) as Array<{
      success: boolean;
      returnData: string;
    }>;
    return raw.map((r) => ({
      success: Boolean(r.success),
      returnData: r.returnData
    }));
  }
}
