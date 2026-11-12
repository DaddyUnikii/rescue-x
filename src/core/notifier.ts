import { RescueReceipt } from "../types/index.js";

export class WebhookNotifier {
  public static formatTelegramAlert(receipt: RescueReceipt): string {
    return [
      "🛡️ *RescueX Execution Alert*",
      `Status: ${receipt.success ? "✅ SUCCESS" : "❌ FAILED"}`,
      `Rescued Assets: ${receipt.rescuedAssets.length}`,
      `Block Number: #${receipt.blockNumber}`,
      `Gas Spent: ${receipt.gasSpentNative} Native`
    ].join("\n");
  }

  public static formatDiscordPayload(receipt: RescueReceipt) {
    return {
      embeds: [
        {
          title: "RescueX Asset Evacuation",
          color: receipt.success ? 0x00ff00 : 0xff0000,
          fields: [
            { name: "Rescued Count", value: `${receipt.rescuedAssets.length}`, inline: true },
            { name: "Block", value: `#${receipt.blockNumber}`, inline: true },
            { name: "Gas Used", value: receipt.gasSpentNative, inline: true }
          ],
          timestamp: new Date().toISOString()
        }
      ]
    };
  }
}