import { JsonRpcProvider, FeeData, parseUnits } from "ethers";

export interface GasRecommendation {
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
  baseFee: bigint;
  urgencyMultiplier: number;
}

export class GasEstimator {
  private provider: JsonRpcProvider;

  constructor(provider: JsonRpcProvider) {
    this.provider = provider;
  }

  public async getDynamicFees(urgencyMultiplier = 1.35): Promise<GasRecommendation> {
    const feeData: FeeData = await this.provider.getFeeData();
    const baseFee = feeData.gasPrice ?? parseUnits("20", "gwei");

    // Calculate aggressive priority fee for frontrunning sweeper bots
    const priorityFee = feeData.maxPriorityFeePerGas
      ? (feeData.maxPriorityFeePerGas * BigInt(Math.floor(urgencyMultiplier * 100))) / 100n
      : parseUnits("3", "gwei");

    const maxFee = (baseFee * 2n) + priorityFee;

    return {
      maxFeePerGas: maxFee,
      maxPriorityFeePerGas: priorityFee,
      baseFee,
      urgencyMultiplier
    };
  }
}