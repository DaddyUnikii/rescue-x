# RescueX 🛡️⚡

> **Open-Source EVM Asset Rescuer to Bypass Sweeper Bots and Recover Stuck Tokens / NFTs from Compromised Wallets.**

[![CI](https://github.com/DaddyUnikii/rescue-x/actions/workflows/ci.yml/badge.svg)](https://github.com/DaddyUnikii/rescue-x/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🚨 The Sweeper Bot Problem
When a wallet private key is compromised, attackers deploy automated **sweeper bots** listening to public mempools. The moment a victim deposits native gas (ETH/BNB) to withdraw their valuable tokens, NFTs, or LP stakes, the sweeper bot frontruns the transfer and siphons the gas immediately.

## 💡 How RescueX Bypasses Sweepers
RescueX employs two battle-tested recovery architectures:

```
[ Clean Sponsor Wallet ] -------- (Tx 0: Sponsoring Gas) ---------\
                                                                    ==> [ Private Block Builder / Relay ] ===> Mined in 1 Atomic Block
[ Compromised Wallet ]   --- (Tx 1..N: Asset Evacuation to Safe) --/
```

1. **Atomic Dual-Wallet Bundling:** A clean sponsor wallet supplies exact gas directly to the victim wallet while simultaneously executing the asset evacuation in the exact same block via private bundle relays (**Flashbots Relay** `eth_sendBundle` on Ethereum, **48Club Puissant** `eth_sendPuissant` on BSC, and direct sequencer FIFO on Base/Arbitrum/OP). Sweeper bots never see the transaction in the public mempool.
2. **EIP-2612 Permit Evacuation:** For supported tokens, the victim wallet signs an off-chain EIP-712 permit (auto-detecting EIP-5267 domain version). The sponsor wallet broadcasts `permit` + `transferFrom` and pulls assets with zero gas ever entering the victim wallet.

---

## 🌐 Supported Networks
- **Ethereum Mainnet** (Chain ID: 1 — Flashbots Relay `eth_sendBundle`, EIP-1559)
- **BNB Smart Chain** (Chain ID: 56 — 48Club Puissant `eth_sendPuissant`, Legacy Type-0)
- **Base** (Chain ID: 8453 — Sequencer FIFO, EIP-1559)
- **Arbitrum One** (Chain ID: 42161 — Sequencer FIFO, EIP-1559)
- **Polygon PoS** (Chain ID: 137 — Marlin Relay `eth_sendBundle`, EIP-1559)
- **OP Mainnet** (Chain ID: 10 — Sequencer FIFO, EIP-1559)

---

## 🛠️ Installation & Usage

```bash
git clone https://github.com/DaddyUnikii/rescue-x.git
cd rescue-x
npm install
npm run build
```

### 1. Inspect Networks & Bundle Relays:
```bash
node dist/cli.js chains
```

### 2. Scan Victim Wallet (Multicall3 Batched):
```bash
node dist/cli.js scan -c 56 -v 0xVictimAddress -t 0x55d398326f99059fF775485246999027B3197955
```

### 3. Zero-Gas Preflight Simulation:
```bash
node dist/cli.js simulate -c 56 -v 0xVictimAddress -t 0xSafeRecipient -a 0xTokenAddress --type ERC20 --amount 1000000000000000000
```

### 4. Atomic Dual-Wallet Bundle Rescue (Safe Dry-Run by Default, `--broadcast` for Live):
```bash
export VICTIM_PRIVATE_KEY="0x..."
export SPONSOR_PRIVATE_KEY="0x..."
node dist/cli.js bundle-rescue -c 56 -t 0xSafeRecipient --tokens 0x55d398326f99059fF775485246999027B3197955 --broadcast
```

### 5. Zero-Gas EIP-2612 Permit Evacuation:
```bash
node dist/cli.js permit-rescue -c 1 -a 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 -t 0xSafeRecipient --broadcast
```

### Run Automated Tests:
```bash
npm test
```

---

## 💖 Support / Tip the Whitehat

RescueX is 100% free, open-source, and takes **zero protocol fees**. If this toolkit helped you recover stuck tokens or NFTs from a compromised wallet, consider tipping the builder:

- **EVM Donation Address (ETH / BNB / USDT / USDC / Base / Arbitrum / OP / Polygon):**
  ```text
  0x7EaB937302c35669AC5217bcC81DCEbaF3bc4F73
  ```

---

## 📄 License
MIT License. Created by [Bisikan Satan](https://github.com/DaddyUnikii).
