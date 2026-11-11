import { Wallet, Interface, TypedDataDomain, TypedDataField } from "ethers";

const PERMIT_ABI = [
  "function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s)",
  "function nonces(address owner) view returns (uint256)",
  "function DOMAIN_SEPARATOR() view returns (bytes32)"
];

export interface PermitSignature {
  v: number;
  r: string;
  s: string;
  deadline: bigint;
  value: bigint;
}

export class PermitRescuer {
  private iface: Interface;

  constructor() {
    this.iface = new Interface(PERMIT_ABI);
  }

  public async signPermit(
    victimWallet: Wallet,
    tokenAddress: string,
    tokenName: string,
    chainId: number,
    spenderAddress: string,
    value: bigint,
    nonce: bigint,
    deadlineSeconds = 3600
  ): Promise<PermitSignature> {
    const deadline = BigInt(Math.floor(Date.now() / 1000) + deadlineSeconds);

    const domain: TypedDataDomain = {
      name: tokenName,
      version: "1",
      chainId,
      verifyingContract: tokenAddress
    };

    const types: Record<string, TypedDataField[]> = {
      Permit: [
        { name: "owner", type: "address" },
        { name: "spender", type: "address" },
        { name: "value", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" }
      ]
    };

    const message = {
      owner: victimWallet.address,
      spender: spenderAddress,
      value,
      nonce,
      deadline
    };

    const signature = await victimWallet.signTypedData(domain, types, message);
    const splitSig = {
      r: signature.slice(0, 66),
      s: "0x" + signature.slice(66, 130),
      v: parseInt(signature.slice(130, 132), 16),
      deadline,
      value
    };

    return splitSig;
  }

  public encodePermit(
    owner: string,
    spender: string,
    sig: PermitSignature
  ): string {
    return this.iface.encodeFunctionData("permit", [
      owner,
      spender,
      sig.value,
      sig.deadline,
      sig.v,
      sig.r,
      sig.s
    ]);
  }
}