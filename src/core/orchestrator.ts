import { Wallet, JsonRpcProvider } from "ethers";
import { ChainId, RescuePlan, RescueReceipt, RescueAsset } from "../types/index.js";
import { PrivateRpcManager } from "./provider.js";
import { PreflightSimulator } from "./simulator.js";
import { TransactionBundler } from "./bundler.js";
import { Erc20Rescuer } from "../modules/erc20.js";
import { MemoryScrubber } from "../security/scrubber.js";
import { WebhookNotifier } from "./notifier.js";

export class RescueOrchestrator {
  private chainId: ChainId;
  private rpcManager: PrivateRpcManager;
  private erc20: Erc20Rescuer;
  private bundler: TransactionBundler;
  private simulator: PreflightSimulator;

  constructor(chainId: ChainId) {
    this.chainId = chainId;
    this.rpcManager = new PrivateRpcManager(chainId);
    this.erc20 = new Erc20Rescuer();
    this.bundler = new TransactionBundler(this.rpcManager);
    this.simulator = new PreflightSimulator(this.rpcManager.getProvider(true));
  }

  public async diagnose(victimAddress: string, tokens: string[]): Promise<RescueAsset[]> {
    const provider = this.rpcManager.getProvider(false);
    const discovered: RescueAsset[] = [];

    for (const token of tokens) {
      try {
        const { balance, symbol, decimals } = await this.erc20.getBalance(token, victimAddress, provider);
        if (balance > 0n) {
          discovered.push({
            type: "ERC20",
            contractAddress: token,
            symbol,
            decimals,
            amount: balance.toString()
          });
        }
      } catch {
        // Skip unverified or non-ERC20 tokens
      }
    }
    return discovered;
  }

  public async simulate(plan: RescuePlan): Promise<boolean> {
    const provider = this.rpcManager.getProvider(true);
    const results = await this.simulator.simulateBatch(
      plan.assets.map((asset) => ({
        to: asset.contractAddress,
        data: this.erc20.encodeTransfer(plan.recipient, BigInt(asset.amount ?? "0"))
      }))
    );
    return results.every((r) => r.success);
  }
}