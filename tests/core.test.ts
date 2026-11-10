import { describe, it, expect } from "vitest";
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
  const manager = new PrivateRpcManager(56);
  const bundler = new TransactionBundler(manager);

  it("should estimate gas accurately for multi-tx bundles", () => {
    const totalGas = bundler.estimateTotalGas(3);
    expect(totalGas).toBe(195000n);
  });
});