import crypto from "crypto";
import { RescuePlan } from "../types/index.js";

const BIGINT_TAG = "__bigint__:";

function bigIntReplacer(_key: string, value: unknown): unknown {
  if (typeof value === "bigint") {
    return `${BIGINT_TAG}${value.toString()}`;
  }
  return value;
}

function bigIntReviver(_key: string, value: unknown): unknown {
  if (typeof value === "string" && value.startsWith(BIGINT_TAG)) {
    return BigInt(value.slice(BIGINT_TAG.length));
  }
  return value;
}

export class PlanExporter {
  public static encryptPlan(plan: RescuePlan, secretPassphrase: string): string {
    const salt = crypto.randomBytes(16);
    const iv = crypto.randomBytes(12);
    const key = crypto.scryptSync(secretPassphrase, salt, 32);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

    const plaintext = JSON.stringify(plan, bigIntReplacer);
    let encrypted = cipher.update(plaintext, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag().toString("hex");

    key.fill(0);

    return JSON.stringify({
      version: 1,
      algorithm: "aes-256-gcm",
      salt: salt.toString("hex"),
      iv: iv.toString("hex"),
      authTag,
      data: encrypted
    });
  }

  public static decryptPlan(encryptedPayload: string, secretPassphrase: string): RescuePlan {
    const parsed = JSON.parse(encryptedPayload) as {
      salt?: string;
      iv: string;
      authTag?: string;
      data: string;
    };

    const iv = Buffer.from(parsed.iv, "hex");
    if (parsed.authTag && parsed.salt) {
      const salt = Buffer.from(parsed.salt, "hex");
      const key = crypto.scryptSync(secretPassphrase, salt, 32);
      const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
      decipher.setAuthTag(Buffer.from(parsed.authTag, "hex"));

      let decrypted = decipher.update(parsed.data, "hex", "utf8");
      decrypted += decipher.final("utf8");
      key.fill(0);
      return JSON.parse(decrypted, bigIntReviver) as RescuePlan;
    }

    // Legacy fallback for CBC payloads without authTag
    const key = crypto.scryptSync(secretPassphrase, "salt", 32);
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    let decrypted = decipher.update(parsed.data, "hex", "utf8");
    decrypted += decipher.final("utf8");
    key.fill(0);
    return JSON.parse(decrypted, bigIntReviver) as RescuePlan;
  }
}
