import chalk from "chalk";
import { ChainId, RescuePlan } from "./types/index.js";

export class RescueWizard {
  public static printBanner(): void {
    console.log(chalk.bold.red("\n========================================================"));
    console.log(chalk.bold.white("           RESCUE-X : EVM ASSET EVACUATION TOOL          "));
    console.log(chalk.bold.gray("       Bypass Sweeper Bots via Private Mempool Relays    "));
    console.log(chalk.bold.red("========================================================\n"));
  }

  public static printPlanSummary(plan: RescuePlan): void {
    console.log(chalk.cyan("--- Rescue Plan Configuration ---"));
    console.log(chalk.yellow(`Chain ID       : `) + plan.chainId);
    console.log(chalk.yellow(`Victim Address : `) + plan.victim);
    console.log(chalk.yellow(`Sponsor Address: `) + plan.sponsor);
    console.log(chalk.yellow(`Safe Recipient : `) + plan.recipient);
    console.log(chalk.yellow(`Assets Count   : `) + plan.assets.length);
    console.log(chalk.yellow(`Private Relay  : `) + (plan.usePrivateMempool ? chalk.green("ENABLED") : chalk.red("DISABLED")));
    console.log(chalk.cyan("--------------------------------\n"));
  }
}