# Changelog 📜

All notable changes to **RescueX** are documented in this file.

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