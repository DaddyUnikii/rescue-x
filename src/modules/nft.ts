import { Interface } from "ethers";

const ERC721_ABI = [
  "function safeTransferFrom(address from, address to, uint256 tokenId)",
  "function ownerOf(uint256 tokenId) view returns (address)"
];

const ERC1155_ABI = [
  "function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes data)"
];

export class NftRescuer {
  private erc721Iface: Interface;
  private erc1155Iface: Interface;

  constructor() {
    this.erc721Iface = new Interface(ERC721_ABI);
    this.erc1155Iface = new Interface(ERC1155_ABI);
  }

  public encodeErc721Rescue(from: string, to: string, tokenId: string | bigint): string {
    return this.erc721Iface.encodeFunctionData("safeTransferFrom", [from, to, tokenId]);
  }

  public encodeErc1155Rescue(
    from: string,
    to: string,
    tokenId: string | bigint,
    amount: string | bigint
  ): string {
    return this.erc1155Iface.encodeFunctionData("safeTransferFrom", [from, to, tokenId, amount, "0x"]);
  }
}