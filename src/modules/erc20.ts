import { Contract, Interface, JsonRpcProvider } from "ethers";

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)"
];

export class Erc20Rescuer {
  private iface: Interface;

  constructor() {
    this.iface = new Interface(ERC20_ABI);
  }

  public async getBalance(
    tokenAddress: string,
    accountAddress: string,
    provider: JsonRpcProvider
  ): Promise<{ balance: bigint; symbol: string; decimals: number }> {
    const contract = new Contract(tokenAddress, ERC20_ABI, provider);
    const [balance, symbol, decimals] = await Promise.all([
      contract.balanceOf(accountAddress) as Promise<bigint>,
      contract.symbol().catch(() => "UNKNOWN") as Promise<string>,
      contract.decimals().catch(() => 18) as Promise<number>
    ]);

    return { balance, symbol, decimals };
  }

  public encodeTransfer(recipient: string, amount: bigint): string {
    return this.iface.encodeFunctionData("transfer", [recipient, amount]);
  }

  public encodeTransferFrom(sender: string, recipient: string, amount: bigint): string {
    return this.iface.encodeFunctionData("transferFrom", [sender, recipient, amount]);
  }
}