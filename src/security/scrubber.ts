export class MemoryScrubber {
  public static scrubBuffer(buf: Buffer): void {
    buf.fill(0);
  }

  public static scrubString(str: string): string {
    return "*".repeat(str.length);
  }

  public static sanitizeReceipt<T extends Record<string, any>>(data: T): Partial<T> {
    const sanitized = { ...data };
    delete (sanitized as any).privateKey;
    delete (sanitized as any).seedPhrase;
    delete (sanitized as any).rawSignature;
    return sanitized;
  }
}