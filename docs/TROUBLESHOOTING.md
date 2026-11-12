# Troubleshooting & Security Playbook 🛠️

## Common Issues & Solutions

### 1. "Nonce Too Low" or Nonce Collision
- **Cause:** A previous transaction is pending in the public mempool or another script is active on the same wallet.
- **Fix:** Fetch latest nonce with `provider.getTransactionCount(address, "pending")` and increment by 1.

### 2. Sweeper Bot Frontruns Despite Private RPC
- **Cause:** Using a public RPC alongside private relays.
- **Fix:** Ensure all calls (including gas estimation and balance probes) route exclusively through verified private endpoints (e.g. Flashbots Protect, 48Club BSC).

### 3. Reverts on ERC-20 Transfer
- **Cause:** Blacklisted addresses, paused tokens, or fee-on-transfer deductions.
- **Fix:** Run the `PreflightSimulator` before execution to decode exact contract revert reasons.