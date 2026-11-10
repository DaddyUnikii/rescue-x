#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import { VERSION } from "./index.js";
import { SUPPORTED_CHAINS } from "./core/provider.js";
import { ChainId } from "./types/index.js";

const program = new Command();

program
  .name("rescue-x")
  .description("EVM asset rescuer bypassing sweeper bots using private mempool relays")
  .version(VERSION);

program
  .command("chains")
  .description("List all supported EVM networks and private RPC endpoints")
  .action(() => {
    console.log(chalk.bold.cyan("\n=== RescueX Supported Networks ==="));
    for (const [id, c] of Object.entries(SUPPORTED_CHAINS)) {
      console.log(
        chalk.green(`[Chain ${id}] ${c.name}`) +
        ` | Private RPC: ${c.privateRpc.length > 0 ? chalk.yellow("Available") : chalk.red("None")}`
      );
    }
    console.log("");
  });

program
  .command("scan")
  .description("Scan victim wallet for stuck ERC-20 and NFT balances")
  .requiredOption("-c, --chain <id>", "Chain ID (e.g. 1, 56, 8453)")
  .requiredOption("-v, --victim <address>", "Victim wallet address")
  .action((options) => {
    console.log(chalk.yellow(`Scanning victim address: ${options.victim} on Chain ${options.chain}...`));
    console.log(chalk.green("Scan engine ready. Configure assets in config.json."));
  });

program.parse(process.argv);