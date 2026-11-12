import { Wallet, TransactionRequest, formatEther } from "ethers";
import { ChainId, RescuePlan, RescueReceipt, RescueAsset } from "../types/index.js";
import { PrivateRpcManager } from "./provider.js";
import { PreflightSimulator } from "./simulator.js";
import { TransactionBundler } from "./bundler.js";
import { GasEstimator } from "./gas.js";
import { Erc20Rescuer } from "../modules/erc20.js";
import { NftRescuer } from "../modules/nft.js";
import { PermitRescuer } from "../modules/permit.js";
import { MulticallBatcher, BatchCall } from "../modules/multicall.js";

export interface ExecuteBundleOptions {
  victimPrivateKey: string;
  sponsorPrivateKey: string;
  urgencyMultiplier?: number;
  dryRun?: boolean;
  targetBlockNumber?: number;
}

export interface ExecutePermitOptions {
  victimPrivateKey: string;
  sponsorPrivateKey: string;
  tokenAddress: string;
  recipient: string;
  amount?: bigint;
  urgencyMultiplier?: number;
  dryRun?: boolean;
}

export class RescueOrchestrator {
  private chainId: ChainId;
  private rpcManager: PrivateRpcManager;
  private erc20: Erc20Rescuer;
  private nft: NftRescuer;
  private permit: PermitRescuer;
  private multicall: MulticallBatcher;
  private bundler: TransactionBundler;
  private simulator: PreflightSimulator;
  private gasEstimator: GasEstimator;

  constructor(chainId: ChainId, customRpcUrl?: string) {
    this.chainId = chainId;
    this.rpcManager = new PrivateRpcManager(chainId, customRpcUrl);
    this.erc20 = new Erc20Rescuer();
    this.nft = new NftRescuer();
    this.permit = new PermitRescuer();
    this.multicall = new MulticallBatcher();
    this.bundler = new TransactionBundler(this.rpcManager);
    const readProvider = this.rpcManager.getProvider(false);
    this.simulator = new PreflightSimulator(readProvider);
    this.gasEstimator = new GasEstimator(readProvider, chainId);
  }

  public async diagnose(victimAddress: string, tokens: string[]): Promise<RescueAsset[]> {
    if (tokens.length === 0) return [];
    const provider = this.rpcManager.getProvider(false);
    const iface = this.erc20.getInterface();

    // Fast path: batch all balanceOf, symbol, and decimals reads in a single Multicall3 staticCall
    try {
      const calls: BatchCall[] = [];
      for (const token of tokens) {
        calls.push({
          target: token,
          allowFailure: true,
          callData: iface.encodeFunctionData("balanceOf", [victimAddress])
        });
        calls.push({
          target: token,
          allowFailure: true,
          callData: iface.encodeFunctionData("symbol", [])
        });
        calls.push({
          target: token,
          allowFailure: true,
          callData: iface.encodeFunctionData("decimals", [])
        });
      }

      const batchResults = await this.multicall.executeReadBatch(calls, provider);
      const discovered: RescueAsset[] = [];

      for (let i = 0; i < tokens.length; i++) {
        const balRes = batchResults[i * 3];
        const symRes = batchResults[i * 3 + 1];
        const decRes = batchResults[i * 3 + 2];

        if (!balRes?.success || balRes.returnData === "0x") continue;
        const decodedBal = iface.decodeFunctionResult("balanceOf", balRes.returnData);
        const balance = decodedBal[0] as bigint;
        if (balance <= 0n) continue;

        let symbol = "UNKNOWN";
        if (symRes?.success && symRes.returnData !== "0x") {
          try {
            const decodedSym = iface.decodeFunctionResult("symbol", symRes.returnData);
            symbol = String(decodedSym[0]);
          } catch {}
        }

        let decimals = 18;
        if (decRes?.success && decRes.returnData !== "0x") {
          try {
            const decodedDec = iface.decodeFunctionResult("decimals", decRes.returnData);
            decimals = Number(decodedDec[0]);
          } catch {}
        }

        discovered.push({
          type: "ERC20",
          contractAddress: tokens[i],
          symbol,
          decimals,
          amount: balance.toString()
        });
      }

      return discovered;
    } catch {
      // Fallback: sequential per-token check if Multicall3 is unavailable
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
  }

  public encodeAssetEvacuationTx(asset: RescueAsset, victim: string, recipient: string): TransactionRequest {
    if (asset.type === "ERC721") {
      if (!asset.tokenId) {
        throw new Error(`ERC721 asset ${asset.contractAddress} requires tokenId`);
      }
      return {
        from: victim,
        to: asset.contractAddress,
        data: this.nft.encodeErc721Rescue(victim, recipient, BigInt(asset.tokenId)),
        value: 0n
      };
    }

    if (asset.type === "ERC1155") {
      if (!asset.tokenId) {
        throw new Error(`ERC1155 asset ${asset.contractAddress} requires tokenId`);
      }
      return {
        from: victim,
        to: asset.contractAddress,
        data: this.nft.encodeErc1155Rescue(
          victim,
          recipient,
          BigInt(asset.tokenId),
          BigInt(asset.amount ?? "1")
        ),
        value: 0n
      };
    }

    if (asset.type === "NATIVE") {
      return {
        from: victim,
        to: recipient,
        value: BigInt(asset.amount ?? "0"),
        data: "0x"
      };
    }

    return {
      from: victim,
      to: asset.contractAddress,
      data: this.erc20.encodeTransfer(recipient, BigInt(asset.amount ?? "0")),
      value: 0n
    };
  }

  public async simulate(plan: RescuePlan): Promise<boolean> {
    const txs = plan.assets.map((asset) =>
      this.encodeAssetEvacuationTx(asset, plan.victim, plan.recipient)
    );
    const results = await this.simulator.simulateBatch(txs);
    return results.every((r) => r.success);
  }

  public async executeBundleRescue(
    plan: RescuePlan,
    options: ExecuteBundleOptions
  ): Promise<RescueReceipt> {
    const provider = this.rpcManager.getProvider(false);
    const sponsorWallet = new Wallet(options.sponsorPrivateKey, provider);
    const victimWallet = new Wallet(options.victimPrivateKey, provider);

    const fees = await this.gasEstimator.getDynamicFees(options.urgencyMultiplier ?? 1.35);
    const rawVictimTxs = plan.assets.map((asset) =>
      this.encodeAssetEvacuationTx(asset, victimWallet.address, plan.recipient)
    );

    const simResults = await this.simulator.simulateBatch(rawVictimTxs);
    const victimTxsWithGas: TransactionRequest[] = rawVictimTxs.map((tx, idx) => {
      const sim = simResults[idx];
      if (!sim.success) {
        throw new Error(
          `Preflight simulation failed for asset #${idx} (${plan.assets[idx].contractAddress}): ${sim.revertReason}`
        );
      }
      // Add 25% gas safety buffer above estimate
      const bufferedGas = sim.gasUsed > 0n ? (sim.gasUsed * 125n) / 100n : 85000n;
      return { ...tx, gasLimit: bufferedGas };
    });

    const signedBundle = await this.bundler.signBundle(
      sponsorWallet,
      victimWallet,
      victimTxsWithGas,
      fees
    );

    const blockNumber = await provider.getBlockNumber().catch(() => 0);

    if (options.dryRun) {
      return {
        success: true,
        transactions: signedBundle.txHashes,
        rescuedAssets: plan.assets,
        blockNumber,
        timestamp: Date.now(),
        gasSpentNative: formatEther(signedBundle.requiredSponsorWei),
        relayResponse: { dryRun: true, rawTransactions: signedBundle.rawTransactions }
      };
    }

    const broadcast = await this.bundler.broadcastBundle(
      signedBundle,
      sponsorWallet,
      options.targetBlockNumber
    );

    return {
      success: true,
      transactions: broadcast.txHashes,
      rescuedAssets: plan.assets,
      blockNumber: broadcast.targetBlock ?? blockNumber,
      timestamp: Date.now(),
      gasSpentNative: formatEther(signedBundle.requiredSponsorWei),
      relayResponse: broadcast.relayResponse
    };
  }

  public async executePermitRescue(options: ExecutePermitOptions): Promise<RescueReceipt> {
    const readProvider = this.rpcManager.getProvider(false);
    const txProvider = this.rpcManager.getProvider(true);
    const victimWallet = new Wallet(options.victimPrivateKey);
    const sponsorWallet = new Wallet(options.sponsorPrivateKey, txProvider);

    const [{ balance, symbol, decimals }, meta, fees] = await Promise.all([
      this.erc20.getBalance(options.tokenAddress, victimWallet.address, readProvider),
      this.permit.getPermitMetadata(options.tokenAddress, victimWallet.address, readProvider),
      this.gasEstimator.getDynamicFees(options.urgencyMultiplier ?? 1.25)
    ]);

    const rescueAmount = options.amount ?? balance;
    if (rescueAmount <= 0n) {
      throw new Error(`No positive balance of ${symbol} found on victim ${victimWallet.address}`);
    }

    const sig = await this.permit.signPermit(
      victimWallet,
      options.tokenAddress,
      meta.name,
      this.chainId,
      sponsorWallet.address,
      rescueAmount,
      meta.nonce,
      3600,
      meta.version
    );

    const permitCalldata = this.permit.encodePermit(victimWallet.address, sponsorWallet.address, sig);
    const transferFromCalldata = this.erc20.encodeTransferFrom(
      victimWallet.address,
      options.recipient,
      rescueAmount
    );

    const sponsorNonce = await readProvider.getTransactionCount(sponsorWallet.address, "pending");
    const feeProps = fees.type === 0
      ? { type: 0, gasPrice: fees.gasPrice ?? fees.maxFeePerGas }
      : { type: 2, maxFeePerGas: fees.maxFeePerGas, maxPriorityFeePerGas: fees.maxPriorityFeePerGas };

    const permitTxReq: TransactionRequest = {
      from: sponsorWallet.address,
      to: options.tokenAddress,
      data: permitCalldata,
      nonce: sponsorNonce,
      chainId: BigInt(this.chainId),
      gasLimit: 95000n,
      value: 0n,
      ...feeProps
    };

    const transferTxReq: TransactionRequest = {
      from: sponsorWallet.address,
      to: options.tokenAddress,
      data: transferFromCalldata,
      nonce: sponsorNonce + 1,
      chainId: BigInt(this.chainId),
      gasLimit: 85000n,
      value: 0n,
      ...feeProps
    };

    const signedPermitTx = await sponsorWallet.signTransaction(permitTxReq);
    const signedTransferTx = await sponsorWallet.signTransaction(transferTxReq);
    const blockNumber = await readProvider.getBlockNumber().catch(() => 0);
    const effectivePrice = fees.type === 0 ? (fees.gasPrice ?? fees.maxFeePerGas) : fees.maxFeePerGas;
    const estGasNative = formatEther(180000n * effectivePrice);

    const asset: RescueAsset = {
      type: "ERC20",
      contractAddress: options.tokenAddress,
      symbol,
      decimals,
      amount: rescueAmount.toString()
    };

    if (options.dryRun) {
      return {
        success: true,
        transactions: [signedPermitTx, signedTransferTx],
        rescuedAssets: [asset],
        blockNumber,
        timestamp: Date.now(),
        gasSpentNative: estGasNative,
        relayResponse: { dryRun: true, signature: sig }
      };
    }

    const tx1 = await txProvider.broadcastTransaction(signedPermitTx);
    await tx1.wait(1);
    const tx2 = await txProvider.broadcastTransaction(signedTransferTx);
    const receipt2 = await tx2.wait(1);

    return {
      success: true,
      transactions: [tx1.hash, tx2.hash],
      rescuedAssets: [asset],
      blockNumber: receipt2?.blockNumber ?? blockNumber,
      timestamp: Date.now(),
      gasSpentNative: estGasNative
    };
  }
}
