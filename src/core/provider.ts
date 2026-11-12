import { JsonRpcProvider } from "ethers";
import { ChainId, ChainConfig } from "../types/index.js";

export const SUPPORTED_CHAINS: Record<ChainId, ChainConfig> = {
  1: {
    id: 1,
    name: "Ethereum Mainnet",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    publicRpc: ["https://eth.llamarpc.com", "https://ethereum-rpc.publicnode.com"],
    privateRpc: ["https://rpc.flashbots.net/fast", "https://rpc.mevblocker.io"],
    bundleRelayUrl: "https://relay.flashbots.net",
    bundleMethod: "eth_sendBundle",
    supportsEip1559: true,
    blockExplorer: "https://etherscan.io",
    supportsFlashbots: true,
    supportsPrivateTx: true
  },
  56: {
    id: 56,
    name: "BNB Smart Chain",
    nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
    publicRpc: ["https://bsc-dataseed.binance.org", "https://bsc-rpc.publicnode.com"],
    privateRpc: ["https://rpc.48.club", "https://bsc-private.48.club"],
    bundleRelayUrl: "https://puissant-bsc.48.club",
    bundleMethod: "eth_sendPuissant",
    supportsEip1559: false,
    blockExplorer: "https://bscscan.com",
    supportsFlashbots: false,
    supportsPrivateTx: true
  },
  8453: {
    id: 8453,
    name: "Base",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    publicRpc: ["https://mainnet.base.org", "https://base-rpc.publicnode.com"],
    privateRpc: ["https://mainnet.base.org"],
    bundleRelayUrl: "https://mainnet.base.org",
    bundleMethod: "eth_sendRawTransaction",
    supportsEip1559: true,
    blockExplorer: "https://basescan.org",
    supportsFlashbots: false,
    supportsPrivateTx: true
  },
  42161: {
    id: 42161,
    name: "Arbitrum One",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    publicRpc: ["https://arb1.arbitrum.io/rpc", "https://arbitrum-one-rpc.publicnode.com"],
    privateRpc: ["https://arb1.arbitrum.io/rpc"],
    bundleRelayUrl: "https://arb1.arbitrum.io/rpc",
    bundleMethod: "eth_sendRawTransaction",
    supportsEip1559: true,
    blockExplorer: "https://arbiscan.io",
    supportsFlashbots: false,
    supportsPrivateTx: true
  },
  137: {
    id: 137,
    name: "Polygon PoS",
    nativeCurrency: { name: "POL", symbol: "POL", decimals: 18 },
    publicRpc: ["https://polygon-rpc.com", "https://polygon-bor-rpc.publicnode.com"],
    privateRpc: ["https://polygon-rpc.com"],
    bundleRelayUrl: "https://bor.txrelay.marlin.org",
    bundleMethod: "eth_sendBundle",
    supportsEip1559: true,
    blockExplorer: "https://polygonscan.com",
    supportsFlashbots: false,
    supportsPrivateTx: true
  },
  10: {
    id: 10,
    name: "OP Mainnet",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    publicRpc: ["https://mainnet.optimism.io", "https://optimism-rpc.publicnode.com"],
    privateRpc: ["https://mainnet.optimism.io"],
    bundleRelayUrl: "https://mainnet.optimism.io",
    bundleMethod: "eth_sendRawTransaction",
    supportsEip1559: true,
    blockExplorer: "https://optimistic.etherscan.io",
    supportsFlashbots: false,
    supportsPrivateTx: true
  }
};

export class PrivateRpcManager {
  private chainId: ChainId;
  private customRpcUrl?: string;

  constructor(chainId: ChainId, customRpcUrl?: string) {
    if (!SUPPORTED_CHAINS[chainId]) {
      throw new Error(`Unsupported chain id: ${chainId}`);
    }
    this.chainId = chainId;
    this.customRpcUrl = customRpcUrl;
  }

  public getChainConfig(): ChainConfig {
    return SUPPORTED_CHAINS[this.chainId];
  }

  public getProvider(usePrivate = true): JsonRpcProvider {
    const config = this.getChainConfig();
    if (this.customRpcUrl) {
      return new JsonRpcProvider(this.customRpcUrl, this.chainId, { staticNetwork: true });
    }

    const endpoint = (usePrivate && config.privateRpc.length > 0)
      ? config.privateRpc[0]
      : config.publicRpc[0];

    return new JsonRpcProvider(endpoint, this.chainId, { staticNetwork: true });
  }

  public getBundleRelayUrl(): string {
    const config = this.getChainConfig();
    return config.bundleRelayUrl ?? config.privateRpc[0] ?? config.publicRpc[0];
  }

  public async verifyConnection(): Promise<{ latencyMs: number; blockNumber: number }> {
    const provider = this.getProvider(false);
    const start = Date.now();
    const blockNumber = await provider.getBlockNumber();
    const latencyMs = Date.now() - start;
    return { latencyMs, blockNumber };
  }
}
