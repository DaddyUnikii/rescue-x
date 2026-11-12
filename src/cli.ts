#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import { VERSION } from "./index.js";
import { SUPPORTED_CHAINS } from "./core/provider.js";
import { RescueOrchestrator } from "./core/orchestrator.js";
import { RescueWizard } from "./cli/wizard.js";
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
    RescueWizard.printBanner();
    console.log(chalk.bold.cyan("=== Supported Networks ==="));
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
  .description("Scan victim wallet for stuck ERC-20 balances")
  .requiredOption("-c, --chain <id>", "Chain ID (e.g. 1, 56, 8453)")
  .requiredOption("-v, --victim <address>", "Victim wallet address")
  .option("-t, --tokens <addresses...>", "Token contract addresses to inspect")
  .action(async (options) => {
    RescueWizard.printBanner();
    console.log(chalk.yellow(`Scanning victim: ${options.victim} on Chain ${options.chain}...`));
    const orchestrator = new RescueOrchestrator(Number(options.chain) as ChainId);
    const tokens = options.tokens ?? [];
    const discovered = await orchestrator.diagnose(options.victim, tokens);

    if (discovered.length === 0) {
      console.log(chalk.gray("No positive balances found on specified token list."));
    } else {
      console.log(chalk.green(`\nFound ${discovered.length} rescuable asset(s):`));
      for (const a of discovered) {
        console.log(` - ${a.symbol} (${a.contractAddress}): ${a.amount}`);
      }
    }
  });

program.parse(process.argv);