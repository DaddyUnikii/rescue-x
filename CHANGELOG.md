# Changelog 📜

All notable changes to **RescueX** are documented in this file.

## [1.1.0] - 2026-11-12
### Fixed & Hardened
- **Atomic Bundle Execution (`TransactionBundler` & `RescueOrchestrator`):**
  - Implemented real offline bundle transaction signing (`signBundle`) with exact sponsor gas funding calculation and automatic nonce resolution.
  - Added real private relay dispatch (`broadcastBundle`): `eth_sendBundle` with `X-Flashbots-Signature` on Ethereum/Polygon, `eth_sendPuissant` on 48Club BSC (`https://puissant-bsc.48.club`), and strict FIFO `eth_sendRawTransaction` on L2 sequencers (Base, Arbitrum, Optimism).
- **Zero-Gas Preflight Simulation (`PreflightSimulator` & `RescueOrchestrator`):**
  - Attached explicit `from: victim` address and `gasPrice: 0n` during `eth_call` simulation so 0-ETH compromised wallets simulate accurately without reverting on balance checks.
  - Added full calldata encoding support for `ERC20`, `ERC721`, `ERC1155`, and `NATIVE` assets in `encodeAssetEvacuationTx`.
- **Multicall3 Fast Diagnostics (`MulticallBatcher`):**
  - Upgraded `diagnose()` to batch `balanceOf`, `symbol`, and `decimals` queries into a single `Multicall3.aggregate3` static call with graceful sequential fallback.
- **EIP-2612 Permit Evacuation (`PermitRescuer`):**
  - Added on-chain EIP-5267 `eip712Domain()` / `version()` auto-detection instead of hardcoded `"1"`, canonical `ethers.Signature.from` parsing, and full `executePermitRescue()` workflow in `RescueOrchestrator`.
- **Cryptography & Serialization (`PlanExporter`):**
  - Fixed `JSON.stringify` crash on `BigInt` fields (`estimatedGasTotal`) via custom `BigInt` serializer/deserializer.
  - Upgraded encryption from static-salt AES-256-CBC to authenticated **AES-256-GCM** with random 16-byte `scrypt` salt and added `decryptPlan()`.
- **CLI Commands (`src/cli.ts`):**
  - Added `simulate`, `bundle-rescue`, and `permit-rescue` commands with safe `--dry-run` default and `--broadcast` live flag.

## [1.0.0] - 2026-11-12
### Added
- **Core Architecture:**
  - Multi-chain Private RPC manager with zero-mempool leakage (Ethereum, BSC, Base, Arbitrum, Polygon, OP).
  - Preflight simulation engine for zero-gas dry-runs.
  - Dual-wallet atomic bundler with sponsored gas injection.
  - EIP-1559 dynamic fee calculation with surge protection.
- **Evacuation Modules:**
  - ERC-20 token balance scanner and atomic transfer builder.
  - ERC-721 and ERC-1155 NFT evacuation engine.
  - EIP-2612 off-chain permit signature evacuation (zero native gas required on victim).
  - Staking, LP emergency withdrawal, and Merkle claim evacuation.
  - Multicall3 batching integration.
- **Security & Tooling:**
  - Runtime memory scrubber for private key sanitization.
  - AES-256 encrypted plan export and import.
  - Instant Telegram and Discord execution alerts.
  - Interactive terminal CLI wizard.
  - Complete automated CI/CD pipeline on GitHub Actions.
