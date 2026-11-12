import { Wallet, TransactionRequest, keccak256, id } from "ethers";
import { PrivateRpcManager } from "./provider.js";
import { GasRecommendation } from "./gas.js";

export interface BundleTx {
  signer: Wallet;
  request: TransactionRequest;
}

export interface SignedBundle {
  rawTransactions: string[];
  txHashes: string[];
  totalGasLimit: bigint;
  requiredSponsorWei: bigint;
}

export interface RelayBroadcastResult {
  bundleHash?: string;
  txHashes: string[];
  targetBlock?: number;
  relayResponse: unknown;
}

export class TransactionBundler {
  private rpcManager: PrivateRpcManager;

  constructor(rpcManager: PrivateRpcManager) {
    this.rpcManager = rpcManager;
  }

  public createGasSponsorTx(
    sponsorWallet: Wallet,
    victimAddress: string,
    gasAmountWei: bigint,
    fees?: GasRecommendation
  ): TransactionRequest {
    const chainConfig = this.rpcManager.getChainConfig();
    const is1559 = fees ? fees.type === 2 : chainConfig.supportsEip1559;

    if (!is1559) {
      return {
        from: sponsorWallet.address,
        to: victimAddress,
        value: gasAmountWei,
        gasLimit: 21000n,
        type: 0,
        gasPrice: fees?.gasPrice ?? fees?.maxFeePerGas
      };
    }

    return {
      from: sponsorWallet.address,
      to: victimAddress,
      value: gasAmountWei,
      gasLimit: 21000n,
      type: 2,
      maxFeePerGas: fees?.maxFeePerGas,
      maxPriorityFeePerGas: fees?.maxPriorityFeePerGas
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

  public async signBundle(
    sponsorWallet: Wallet,
    victimWallet: Wallet,
    victimTxs: TransactionRequest[],
    fees: GasRecommendation,
    sponsorNonce?: number,
    victimNonce?: number
  ): Promise<SignedBundle> {
    const provider = this.rpcManager.getProvider(false);
    const chainId = BigInt(this.rpcManager.getChainConfig().id);

    const [resolvedSponsorNonce, resolvedVictimNonce] = await Promise.all([
      sponsorNonce !== undefined
        ? Promise.resolve(sponsorNonce)
        : provider.getTransactionCount(sponsorWallet.address, "pending"),
      victimNonce !== undefined
        ? Promise.resolve(victimNonce)
        : provider.getTransactionCount(victimWallet.address, "pending")
    ]);

    const effectiveGasPrice = fees.type === 0
      ? (fees.gasPrice ?? fees.maxFeePerGas)
      : fees.maxFeePerGas;

    let victimGasLimitSum = 0n;
    const preparedVictimTxs: TransactionRequest[] = [];

    for (let i = 0; i < victimTxs.length; i++) {
      const vTx = victimTxs[i];
      const gasLimit = vTx.gasLimit ? BigInt(vTx.gasLimit) : 85000n;
      victimGasLimitSum += gasLimit;

      const populated: TransactionRequest = {
        ...vTx,
        from: victimWallet.address,
        nonce: resolvedVictimNonce + i,
        chainId,
        gasLimit,
        value: vTx.value ?? 0n,
        ...(fees.type === 0
          ? { type: 0, gasPrice: effectiveGasPrice }
          : {
              type: 2,
              maxFeePerGas: fees.maxFeePerGas,
              maxPriorityFeePerGas: fees.maxPriorityFeePerGas
            })
      };
      preparedVictimTxs.push(populated);
    }

    const requiredSponsorWei = victimGasLimitSum * effectiveGasPrice;
    const sponsorTx: TransactionRequest = {
      ...this.createGasSponsorTx(sponsorWallet, victimWallet.address, requiredSponsorWei, fees),
      nonce: resolvedSponsorNonce,
      chainId
    };

    const rawTransactions: string[] = [];
    const txHashes: string[] = [];

    const signedSponsor = await sponsorWallet.signTransaction(sponsorTx);
    rawTransactions.push(signedSponsor);
    txHashes.push(keccak256(signedSponsor));

    for (const vTx of preparedVictimTxs) {
      const signedVictim = await victimWallet.signTransaction(vTx);
      rawTransactions.push(signedVictim);
      txHashes.push(keccak256(signedVictim));
    }

    return {
      rawTransactions,
      txHashes,
      totalGasLimit: 21000n + victimGasLimitSum,
      requiredSponsorWei
    };
  }

  public async broadcastBundle(
    signedBundle: SignedBundle,
    authSigner: Wallet,
    targetBlockNumber?: number
  ): Promise<RelayBroadcastResult> {
    const chainConfig = this.rpcManager.getChainConfig();
    const relayUrl = this.rpcManager.getBundleRelayUrl();
    const method = chainConfig.bundleMethod ?? "eth_sendRawTransaction";

    if (method === "eth_sendBundle") {
      const provider = this.rpcManager.getProvider(false);
      const targetBlock = targetBlockNumber ?? ((await provider.getBlockNumber()) + 1);
      const blockHex = "0x" + targetBlock.toString(16);

      const body = JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_sendBundle",
        params: [
          {
            txs: signedBundle.rawTransactions,
            blockNumber: blockHex
          }
        ]
      });

      const bodyHash = id(body);
      const flasbotsSig = await authSigner.signMessage(bodyHash);
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-Flashbots-Signature": `${authSigner.address}:${flasbotsSig}`
      };

      const res = await fetch(relayUrl, { method: "POST", headers, body });
      const json = (await res.json()) as { result?: { bundleHash?: string }; error?: { message?: string } };
      if (json.error) {
        throw new Error(`Bundle relay rejected eth_sendBundle: ${json.error.message || JSON.stringify(json.error)}`);
      }

      return {
        bundleHash: json.result?.bundleHash,
        txHashes: signedBundle.txHashes,
        targetBlock,
        relayResponse: json
      };
    }

    if (method === "eth_sendPuissant") {
      const maxTimestamp = Math.floor(Date.now() / 1000) + 120;
      const body = JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_sendPuissant",
        params: [
          {
            txs: signedBundle.rawTransactions,
            maxTimestamp,
            acceptReverting: []
          }
        ]
      });

      const res = await fetch(relayUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body
      });
      const json = (await res.json()) as { result?: string; error?: { message?: string } };
      if (json.error) {
        throw new Error(`Puissant relay rejected bundle: ${json.error.message || JSON.stringify(json.error)}`);
      }

      return {
        bundleHash: typeof json.result === "string" ? json.result : undefined,
        txHashes: signedBundle.txHashes,
        relayResponse: json
      };
    }

    // Sequencer FIFO fallback (Base, Arbitrum, Optimism): fire raw transactions in strict sequence
    const responses: unknown[] = [];
    for (const rawTx of signedBundle.rawTransactions) {
      const body = JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_sendRawTransaction",
        params: [rawTx]
      });
      const res = await fetch(relayUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body
      });
      const json = (await res.json()) as { result?: string; error?: { message?: string } };
      if (json.error) {
        throw new Error(`Sequencer RPC rejected raw transaction: ${json.error.message || JSON.stringify(json.error)}`);
      }
      responses.push(json);
    }

    return {
      txHashes: signedBundle.txHashes,
      relayResponse: responses
    };
  }
}
