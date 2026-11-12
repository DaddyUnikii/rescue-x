export class MemoryScrubber {
  public static scrubBuffer(buf: Buffer | Uint8Array): void {
    buf.fill(0);
  }

  public static scrubString(str: string): string {
    return "*".repeat(str.length);
  }

  public static scrubObjectKeys(target: Record<string, any>, sensitiveKeys = ["privateKey", "seedPhrase", "rawSignature", "mnemonic"]): void {
    for (const key of sensitiveKeys) {
      if (key in target) {
        if (Buffer.isBuffer(target[key]) || target[key] instanceof Uint8Array) {
          target[key].fill(0);
        }
        delete target[key];
      }
    }
  }

  public static sanitizeReceipt<T extends Record<string, any>>(data: T): Partial<T> {
    const sanitized = { ...data };
    this.scrubObjectKeys(sanitized);
    return sanitized;
  }
}
