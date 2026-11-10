import { Wallet, TransactionRequest, parseUnits } from "ethers";
import { PrivateRpcManager } from "./provider.js";
import { RescuePlan, RescueReceipt } from "../types/index.js";

export interface BundleTx {
  signer: Wallet;
  request: TransactionRequest;
}

export class TransactionBundler {
  private rpcManager: PrivateRpcManager;

  constructor(rpcManager: PrivateRpcManager) {
    this.rpcManager = rpcManager;
  }

  public createGasSponsorTx(
    sponsorWallet: Wallet,
    victimAddress: string,
    gasAmountWei: bigint
  ): TransactionRequest {
    return {
      to: victimAddress,
      value: gasAmountWei,
      type: 2
    };
  }

  public buildOrderedBundle(
    sponsorTx: TransactionRequest,
    sponsorWallet: Wallet,
    victimTxs: TransactionRequest[],
    victimWallet: Wallet
  ): BundleTx[] {
    const bundle: BundleTx[] = [
      { signer: sponsorWallet, request: sponsorTx }
    ];

    for (const vTx of victimTxs) {
      bundle.push({ signer: victimWallet, request: vTx });
    }

    return bundle;
  }

  public estimateTotalGas(txCount: number, baseGasPerTx = 65000n): bigint {
    return BigInt(txCount) * baseGasPerTx;
  }
}