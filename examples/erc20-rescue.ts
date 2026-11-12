/**
 * Example: Standard Dual-Wallet Atomic Rescue
 */
import { RescueOrchestrator } from "../src/index.js";

async function main() {
  const orchestrator = new RescueOrchestrator(56); // BSC
  const victimAddress = "0x000000000000000000000000000000000000dEaD";
  const tokens = ["0x55d398326f99059fF775485246999027B3197955"]; // USDT BSC

  console.log("Diagnosing victim address:", victimAddress);
  const discovered = await orchestrator.diagnose(victimAddress, tokens);
  console.log("Discovered assets:", discovered);
}

main().catch(console.error);