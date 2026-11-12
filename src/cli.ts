#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import { Wallet } from "ethers";
import { VERSION } from "./index.js";
import { SUPPORTED_CHAINS } from "./core/provider.js";
import { RescueOrchestrator } from "./core/orchestrator.js";
import { RescueWizard } from "./cli/wizard.js";
import { ChainId, RescueAsset, RescuePlan } from "./types/index.js";

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
        ` | Method: ${chalk.magenta(c.bundleMethod ?? "eth_sendRawTransaction")}` +
        ` | Relay: ${c.bundleRelayUrl ? chalk.yellow(c.bundleRelayUrl) : chalk.red("None")}`
      );
    }
    console.log("");
  });

program
  .command("scan")
  .description("Scan victim wallet for stuck ERC-20 balances (via Multicall3)")
  .requiredOption("-c, --chain <id>", "Chain ID (e.g. 1, 56, 8453)")
  .requiredOption("-v, --victim <address>", "Victim wallet address")
  .option("-t, --tokens <addresses...>", "Token contract addresses to inspect")
  .option("-r, --rpc <url>", "Custom RPC endpoint override")
  .action(async (options) => {
    RescueWizard.printBanner();
    console.log(chalk.yellow(`Scanning victim: ${options.victim} on Chain ${options.chain}...`));
    const orchestrator = new RescueOrchestrator(Number(options.chain) as ChainId, options.rpc);
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

program
  .command("simulate")
  .description("Run a zero-gas preflight simulation for an asset evacuation plan")
  .requiredOption("-c, --chain <id>", "Chain ID (e.g. 1, 56, 8453)")
  .requiredOption("-v, --victim <address>", "Victim wallet address")
  .requiredOption("-t, --to <recipient>", "Safe recipient wallet address")
  .requiredOption("-a, --asset <address>", "Token or NFT contract address")
  .option("--type <type>", "Asset type: ERC20 | ERC721 | ERC1155", "ERC20")
  .option("--amount <wei>", "Token amount in raw units (wei)", "1")
  .option("--token-id <id>", "Token ID for ERC721 / ERC1155")
  .option("-r, --rpc <url>", "Custom RPC endpoint override")
  .action(async (options) => {
    RescueWizard.printBanner();
    const chainId = Number(options.chain) as ChainId;
    const orchestrator = new RescueOrchestrator(chainId, options.rpc);
    const asset: RescueAsset = {
      type: options.type,
      contractAddress: options.asset,
      amount: options.amount,
      tokenId: options.tokenId
    };

    const plan: RescuePlan = {
      chainId,
      victim: options.victim,
      sponsor: "0x0000000000000000000000000000000000000000",
      recipient: options.to,
      assets: [asset],
      usePrivateMempool: true,
      estimatedGasTotal: 85000n,
      priorityFeeGwei: 3
    };

    RescueWizard.printPlanSummary(plan);
    const ok = await orchestrator.simulate(plan);
    if (ok) {
      console.log(chalk.bold.green("✅ Simulation PASSED: Asset transfer call succeeded."));
    } else {
      console.log(chalk.bold.red("❌ Simulation FAILED: Call reverted on target contract."));
      process.exitCode = 1;
    }
  });

program
  .command("bundle-rescue")
  .description("Execute or dry-run an atomic dual-wallet sponsored bundle rescue")
  .requiredOption("-c, --chain <id>", "Chain ID (e.g. 1, 56, 8453)")
  .requiredOption("-t, --to <recipient>", "Safe recipient address")
  .requiredOption("--tokens <addresses...>", "ERC-20 token contract addresses to rescue")
  .option("--victim-key <hex>", "Victim private key (or set VICTIM_PRIVATE_KEY env)")
  .option("--sponsor-key <hex>", "Clean sponsor private key (or set SPONSOR_PRIVATE_KEY env)")
  .option("--urgency <multiplier>", "Gas urgency multiplier", "1.35")
  .option("--broadcast", "Broadcast live to private relay (defaults to safe dry-run)", false)
  .option("-r, --rpc <url>", "Custom RPC endpoint override")
  .action(async (options) => {
    RescueWizard.printBanner();
    const victimKey = options.victimKey || process.env.VICTIM_PRIVATE_KEY;
    const sponsorKey = options.sponsorKey || process.env.SPONSOR_PRIVATE_KEY;

    if (!victimKey || !sponsorKey) {
      console.error(chalk.red("Error: Both --victim-key (or VICTIM_PRIVATE_KEY) and --sponsor-key (or SPONSOR_PRIVATE_KEY) are required."));
      process.exitCode = 1;
      return;
    }

    const chainId = Number(options.chain) as ChainId;
    const orchestrator = new RescueOrchestrator(chainId, options.rpc);
    const victimWallet = new Wallet(victimKey);
    const sponsorWallet = new Wallet(sponsorKey);

    console.log(chalk.yellow(`Diagnosing victim ${victimWallet.address}...`));
    const assets = await orchestrator.diagnose(victimWallet.address, options.tokens);
    if (assets.length === 0) {
      console.log(chalk.gray("No positive token balances found to rescue."));
      return;
    }

    const plan: RescuePlan = {
      chainId,
      victim: victimWallet.address,
      sponsor: sponsorWallet.address,
      recipient: options.to,
      assets,
      usePrivateMempool: true,
      estimatedGasTotal: BigInt(assets.length + 1) * 75000n,
      priorityFeeGwei: 3
    };

    RescueWizard.printPlanSummary(plan);
    const dryRun = !options.broadcast;
    console.log(dryRun ? chalk.cyan("Running in DRY-RUN mode (no transactions broadcasted)...") : chalk.red("BROADCASTING LIVE ATOMIC BUNDLE..."));

    const receipt = await orchestrator.executeBundleRescue(plan, {
      victimPrivateKey: victimKey,
      sponsorPrivateKey: sponsorKey,
      urgencyMultiplier: Number(options.urgency),
      dryRun
    });

    console.log(chalk.green(`\n✅ Bundle ${dryRun ? "Prepared (Dry-Run)" : "Broadcasted"} Successfully!`));
    console.log(` - Transactions : ${receipt.transactions.join(", ")}`);
    console.log(` - Sponsor Gas  : ${receipt.gasSpentNative} Native`);
  });

program
  .command("permit-rescue")
  .description("Execute or dry-run a zero-gas EIP-2612 permit token evacuation")
  .requiredOption("-c, --chain <id>", "Chain ID (e.g. 1, 56, 8453)")
  .requiredOption("-a, --token <address>", "ERC-20 Permit token address")
  .requiredOption("-t, --to <recipient>", "Safe recipient address")
  .option("--victim-key <hex>", "Victim private key (or set VICTIM_PRIVATE_KEY env)")
  .option("--sponsor-key <hex>", "Sponsor private key (or set SPONSOR_PRIVATE_KEY env)")
  .option("--broadcast", "Broadcast live transactions (defaults to safe dry-run)", false)
  .option("-r, --rpc <url>", "Custom RPC endpoint override")
  .action(async (options) => {
    RescueWizard.printBanner();
    const victimKey = options.victimKey || process.env.VICTIM_PRIVATE_KEY;
    const sponsorKey = options.sponsorKey || process.env.SPONSOR_PRIVATE_KEY;

    if (!victimKey || !sponsorKey) {
      console.error(chalk.red("Error: Both --victim-key (or VICTIM_PRIVATE_KEY) and --sponsor-key (or SPONSOR_PRIVATE_KEY) are required."));
      process.exitCode = 1;
      return;
    }

    const chainId = Number(options.chain) as ChainId;
    const orchestrator = new RescueOrchestrator(chainId, options.rpc);
    const dryRun = !options.broadcast;

    const receipt = await orchestrator.executePermitRescue({
      victimPrivateKey: victimKey,
      sponsorPrivateKey: sponsorKey,
      tokenAddress: options.token,
      recipient: options.to,
      dryRun
    });

    console.log(chalk.green(`\n✅ Permit Evacuation ${dryRun ? "Prepared (Dry-Run)" : "Completed"}!`));
    console.log(` - Rescued      : ${receipt.rescuedAssets[0]?.amount} ${receipt.rescuedAssets[0]?.symbol}`);
    console.log(` - Est. Gas     : ${receipt.gasSpentNative} Native`);
  });

program.parse(process.argv);
