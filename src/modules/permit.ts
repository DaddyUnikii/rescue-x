import { Contract, Interface, JsonRpcProvider, Wallet, Signature, TypedDataDomain, TypedDataField } from "ethers";

const PERMIT_ABI = [
  "function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s)",
  "function nonces(address owner) view returns (uint256)",
  "function name() view returns (string)",
  "function version() view returns (string)",
  "function eip712Domain() view returns (bytes1 fields, string name, string version, uint256 chainId, address verifyingContract, bytes32 salt, uint256[] extensions)",
  "function DOMAIN_SEPARATOR() view returns (bytes32)"
];

export interface PermitSignature {
  v: number;
  r: string;
  s: string;
  deadline: bigint;
  value: bigint;
  nonce: bigint;
  tokenName: string;
  version: string;
}

export class PermitRescuer {
  private iface: Interface;

  constructor() {
    this.iface = new Interface(PERMIT_ABI);
  }

  public async getPermitMetadata(
    tokenAddress: string,
    ownerAddress: string,
    provider: JsonRpcProvider
  ): Promise<{ name: string; version: string; nonce: bigint }> {
    const contract = new Contract(tokenAddress, PERMIT_ABI, provider);
    const nonce = (await contract.nonces(ownerAddress)) as bigint;

    try {
      const domain = await contract.eip712Domain();
      return {
        name: domain.name as string,
        version: (domain.version as string) || "1",
        nonce
      };
    } catch {
      const [name, version] = await Promise.all([
        contract.name().catch(() => "Token") as Promise<string>,
        contract.version().catch(() => "1") as Promise<string>
      ]);
      return { name, version, nonce };
    }
  }

  public async signPermit(
    victimWallet: Wallet,
    tokenAddress: string,
    tokenName: string,
    chainId: number,
    spenderAddress: string,
    value: bigint,
    nonce: bigint,
    deadlineSeconds = 3600,
    version = "1"
  ): Promise<PermitSignature> {
    const deadline = BigInt(Math.floor(Date.now() / 1000) + deadlineSeconds);

    const domain: TypedDataDomain = {
      name: tokenName,
      version,
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

    const rawSig = await victimWallet.signTypedData(domain, types, message);
    const parsed = Signature.from(rawSig);

    return {
      r: parsed.r,
      s: parsed.s,
      v: parsed.v,
      deadline,
      value,
      nonce,
      tokenName,
      version
    };
  }

  public encodePermit(
    owner: string,
    spender: string,
    sig: Pick<PermitSignature, "v" | "r" | "s" | "deadline" | "value">
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
