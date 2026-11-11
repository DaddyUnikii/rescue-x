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

1. **Atomic Dual-Wallet Bundling:** A clean sponsor wallet supplies gas directly to the victim wallet while simultaneously executing the asset evacuation in the exact same block via private relays (Flashbots Protect, 48Club BSC, MEV-Blocker). Sweeper bots never see the transaction in the public mempool.
2. **EIP-2612 Permit Evacuation:** For supported tokens, the victim wallet signs an off-chain EIP-712 permit. The sponsor wallet broadcasts the permit and pulls assets with zero gas ever entering the victim wallet.

---

## 🌐 Supported Networks
- **Ethereum Mainnet** (Chain ID: 1)
- **BNB Smart Chain** (Chain ID: 56)
- **Base** (Chain ID: 8453)
- **Arbitrum One** (Chain ID: 42161)
- **Polygon PoS** (Chain ID: 137)
- **OP Mainnet** (Chain ID: 10)

---

## 🛠️ Installation & Usage

```bash
git clone https://github.com/DaddyUnikii/rescue-x.git
cd rescue-x
npm install
npm run build
```

### Inspect Networks:
```bash
node dist/cli.js chains
```

### Run Automated Tests:
```bash
npm test
```

---

## 📄 License
MIT License. Created by [Bisikan Satan](https://github.com/DaddyUnikii).