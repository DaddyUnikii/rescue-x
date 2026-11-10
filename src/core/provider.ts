import { JsonRpcProvider } from "ethers";
import { ChainId, ChainConfig } from "../types/index.js";

export const SUPPORTED_CHAINS: Record<ChainId, ChainConfig> = {
  1: {
    id: 1,
    name: "Ethereum Mainnet",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    publicRpc: ["https://rpc.ankr.com/eth", "https://eth.llamarpc.com"],
    privateRpc: ["https://rpc.flashbots.net", "https://protect.flashbots.net"],
    blockExplorer: "https://etherscan.io",
    supportsFlashbots: true,
    supportsPrivateTx: true
  },
  56: {
    id: 56,
    name: "BNB Smart Chain",
    nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
    publicRpc: ["https://binance.llamarpc.com", "https://bsc-dataseed.binance.org"],
    privateRpc: ["https://puppy.48.club", "https://bsc.mevblocker.io"],
    blockExplorer: "https://bscscan.com",
    supportsFlashbots: false,
    supportsPrivateTx: true
  },
  8453: {
    id: 8453,
    name: "Base",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    publicRpc: ["https://mainnet.base.org", "https://base.llamarpc.com"],
    privateRpc: ["https://base.mevblocker.io"],
    blockExplorer: "https://basescan.org",
    supportsFlashbots: false,
    supportsPrivateTx: true
  },
  42161: {
    id: 42161,
    name: "Arbitrum One",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    publicRpc: ["https://arb1.arbitrum.io/rpc"],
    privateRpc: ["https://arbitrum.mevblocker.io"],
    blockExplorer: "https://arbiscan.io",
    supportsFlashbots: false,
    supportsPrivateTx: true
  },
  137: {
    id: 137,
    name: "Polygon PoS",
    nativeCurrency: { name: "POL", symbol: "POL", decimals: 18 },
    publicRpc: ["https://polygon-rpc.com"],
    privateRpc: ["https://polygon.mevblocker.io"],
    blockExplorer: "https://polygonscan.com",
    supportsFlashbots: false,
    supportsPrivateTx: true
  },
  10: {
    id: 10,
    name: "OP Mainnet",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    publicRpc: ["https://mainnet.optimism.io"],
    privateRpc: ["https://optimism.mevblocker.io"],
    blockExplorer: "https://optimistic.etherscan.io",
    supportsFlashbots: false,
    supportsPrivateTx: true
  }
};

export class PrivateRpcManager {
  private chainId: ChainId;

  constructor(chainId: ChainId) {
    this.chainId = chainId;
  }

  public getProvider(usePrivate = true): JsonRpcProvider {
    const config = SUPPORTED_CHAINS[this.chainId];
    if (!config) {
      throw new Error(`Unsupported chain id: ${this.chainId}`);
    }

    const endpoint = (usePrivate && config.privateRpc.length > 0)
      ? config.privateRpc[0]
      : config.publicRpc[0];

    return new JsonRpcProvider(endpoint, this.chainId);
  }

  public async verifyConnection(): Promise<{ latencyMs: number; blockNumber: number }> {
    const provider = this.getProvider(true);
    const start = Date.now();
    const blockNumber = await provider.getBlockNumber();
    const latencyMs = Date.now() - start;
    return { latencyMs, blockNumber };
  }
}