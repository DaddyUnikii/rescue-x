import { describe, it, expect } from "vitest";
import { Wallet, parseUnits } from "ethers";
import { Erc20Rescuer } from "../src/modules/erc20.js";
import { NftRescuer } from "../src/modules/nft.js";
import { TransactionBundler } from "../src/core/bundler.js";
import { PrivateRpcManager } from "../src/core/provider.js";

describe("Erc20Rescuer", () => {
  const rescuer = new Erc20Rescuer();
  const recipient = "0x000000000000000000000000000000000000dEaD";

  it("should encode standard transfer correctly", () => {
    const calldata = rescuer.encodeTransfer(recipient, 1000000000000000000n);
    expect(calldata.startsWith("0xa9059cbb")).toBe(true);
  });
});

describe("NftRescuer", () => {
  const nftRescuer = new NftRescuer();
  const sender = "0x1111111111111111111111111111111111111111";
  const recipient = "0x2222222222222222222222222222222222222222";

  it("should encode ERC721 safeTransferFrom correctly", () => {
    const calldata = nftRescuer.encodeErc721Rescue(sender, recipient, 42n);
    expect(calldata.startsWith("0x42842e0e")).toBe(true);
  });
});

describe("TransactionBundler", () => {
  const managerBsc = new PrivateRpcManager(56);
  const bundlerBsc = new TransactionBundler(managerBsc);

  it("should estimate gas accurately for multi-tx bundles", () => {
    const totalGas = bundlerBsc.estimateTotalGas(3);
    expect(totalGas).toBe(195000n);
  });

  it("should create type-0 legacy sponsor tx for BSC and sign an atomic bundle offline", async () => {
    const sponsor = new Wallet("0x0123456789012345678901234567890123456789012345678901234567890123");
    const victim = new Wallet("0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd");
    const gasPrice = parseUnits("3", "gwei");

    const signed = await bundlerBsc.signBundle(
      sponsor,
      victim,
      [
        {
          to: "0x55d398326f99059fF775485246999027B3197955",
          data: "0xa9059cbb",
          gasLimit: 65000n
        }
      ],
      {
        type: 0,
        gasPrice,
        maxFeePerGas: gasPrice,
        maxPriorityFeePerGas: gasPrice,
        baseFee: gasPrice,
        urgencyMultiplier: 1.35
      },
      10,
      4
    );

    expect(signed.rawTransactions.length).toBe(2);
    expect(signed.txHashes.length).toBe(2);
    expect(signed.totalGasLimit).toBe(86000n);
    expect(signed.requiredSponsorWei).toBe(65000n * gasPrice);
  });
});
