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
      // Clear gas price fields during eth_call so 0-ETH victim wallets do not fail balance checks
      const callTx: TransactionRequest = {
        from: tx.from,
        to: tx.to,
        data: tx.data,
        value: tx.value ?? 0n,
        gasPrice: 0n
      };

      const callResult = await this.provider.call(callTx);
      const gasEstimate = await this.provider
        .estimateGas({
          from: tx.from,
          to: tx.to,
          data: tx.data,
          value: tx.value ?? 0n
        })
        .catch(() => 75000n);

      return {
        success: true,
        gasUsed: gasEstimate,
        returnValue: callResult
      };
    } catch (err: any) {
      return {
        success: false,
        gasUsed: 0n,
        revertReason: err?.shortMessage || err?.reason || err?.message || "Execution reverted"
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
