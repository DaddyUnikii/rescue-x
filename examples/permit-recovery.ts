/**
 * Example: EIP-2612 Off-Chain Zero-Gas Permit Rescue
 */
import { PermitRescuer } from "../src/index.js";

async function main() {
  const permit = new PermitRescuer();
  console.log("Permit Rescuer initialized for zero-gas evacuation.");
}

main().catch(console.error);