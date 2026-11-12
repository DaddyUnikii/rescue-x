export type ChainId = 1 | 56 | 137 | 8453 | 42161 | 10;

export type BundleMethod = "eth_sendBundle" | "eth_sendPuissant" | "eth_sendRawTransaction";

export interface ChainConfig {
  id: ChainId;
  name: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  publicRpc: string[];
  privateRpc: string[];
  bundleRelayUrl?: string;
  bundleMethod?: BundleMethod;
  supportsEip1559: boolean;
  blockExplorer: string;
  supportsFlashbots: boolean;
  supportsPrivateTx: boolean;
}

export type AssetType = "ERC20" | "ERC721" | "ERC1155" | "NATIVE";

export interface RescueAsset {
  type: AssetType;
  contractAddress: string;
  symbol?: string;
  decimals?: number;
  tokenId?: string;
  amount?: string;
}

export interface VictimAccount {
  address: string;
  privateKey: string;
}

export interface SponsorAccount {
  address: string;
  privateKey: string;
}

export interface RescuePlan {
  chainId: ChainId;
  victim: string;
  sponsor: string;
  recipient: string;
  assets: RescueAsset[];
  usePrivateMempool: boolean;
  estimatedGasTotal: bigint;
  priorityFeeGwei: number;
}

export interface RescueReceipt {
  success: boolean;
  transactions: string[];
  rescuedAssets: RescueAsset[];
  blockNumber: number;
  timestamp: number;
  gasSpentNative: string;
  relayResponse?: unknown;
}
