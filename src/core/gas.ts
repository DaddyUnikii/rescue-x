import { JsonRpcProvider, FeeData, parseUnits } from "ethers";
import { SUPPORTED_CHAINS } from "./provider.js";
import { ChainId } from "../types/index.js";

export interface GasRecommendation {
  type: 0 | 2;
  gasPrice?: bigint;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
  baseFee: bigint;
  urgencyMultiplier: number;
}

export class GasEstimator {
  private provider: JsonRpcProvider;
  private chainId?: ChainId;

  constructor(provider: JsonRpcProvider, chainId?: ChainId) {
    this.provider = provider;
    this.chainId = chainId;
  }

  public async getDynamicFees(urgencyMultiplier = 1.35): Promise<GasRecommendation> {
    const scale = BigInt(Math.max(100, Math.floor(urgencyMultiplier * 100)));
    const [feeData, latestBlock] = await Promise.all([
      this.provider.getFeeData(),
      this.provider.getBlock("latest").catch(() => null)
    ]);

    const supports1559 = this.chainId
      ? SUPPORTED_CHAINS[this.chainId]?.supportsEip1559 ?? true
      : latestBlock?.baseFeePerGas != null;

    if (!supports1559) {
      const rawGasPrice = feeData.gasPrice ?? parseUnits("3", "gwei");
      const boostedGasPrice = (rawGasPrice * scale) / 100n;
      return {
        type: 0,
        gasPrice: boostedGasPrice,
        maxFeePerGas: boostedGasPrice,
        maxPriorityFeePerGas: boostedGasPrice,
        baseFee: rawGasPrice,
        urgencyMultiplier
      };
    }

    const blockBaseFee = latestBlock?.baseFeePerGas ?? feeData.gasPrice ?? parseUnits("15", "gwei");
    const rawPriority = feeData.maxPriorityFeePerGas ?? parseUnits("2", "gwei");
    const priorityFee = (rawPriority * scale) / 100n;
    const maxFee = (blockBaseFee * 2n) + priorityFee;

    return {
      type: 2,
      maxFeePerGas: maxFee,
      maxPriorityFeePerGas: priorityFee,
      baseFee: blockBaseFee,
      urgencyMultiplier
    };
  }
}
