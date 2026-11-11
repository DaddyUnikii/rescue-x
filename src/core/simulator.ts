import { JsonRpcProvider, TransactionRequest } from "ethers";

export interface SimulationResult {
  success: boolean;
  gasUsed: bigint;
  revertReason?: string;
  returnValue?: string;
}

export class PreflightSimulator {
  private provider: JsonRpcProvider;

  constructor(provider: JsonRpcProvider) {
    this.provider = provider;
  }

  public async simulateCall(tx: TransactionRequest): Promise<SimulationResult> {
    try {
      const [gasEstimate, callResult] = await Promise.all([
        this.provider.estimateGas(tx),
        this.provider.call(tx)
      ]);

      return {
        success: true,
        gasUsed: gasEstimate,
        returnValue: callResult
      };
    } catch (err: any) {
      return {
        success: false,
        gasUsed: 0n,
        revertReason: err?.message || "Execution reverted"
      };
    }
  }

  public async simulateBatch(txs: TransactionRequest[]): Promise<SimulationResult[]> {
    const results: SimulationResult[] = [];
    for (const tx of txs) {
      results.push(await this.simulateCall(tx));
    }
    return results;
  }
}