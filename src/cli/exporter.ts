import crypto from "crypto";
import { RescuePlan } from "../types/index.js";

export class PlanExporter {
  public static encryptPlan(plan: RescuePlan, secretPassphrase: string): string {
    const iv = crypto.randomBytes(16);
    const key = crypto.scryptSync(secretPassphrase, "salt", 32);
    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
    
    let encrypted = cipher.update(JSON.stringify(plan), "utf8", "hex");
    encrypted += cipher.final("hex");

    return JSON.stringify({
      iv: iv.toString("hex"),
      data: encrypted
    });
  }
}