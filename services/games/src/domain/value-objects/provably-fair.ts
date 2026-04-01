import { createHash, randomBytes } from "node:crypto";

export class ProvablyFair {
  private readonly _serverSeed: string;
  private readonly _serverSeedHash: string;
  private readonly _crashPoint: number;

  private constructor(
    serverSeed: string,
    serverSeedHash: string,
    crashPoint: number
  ) {
    this._serverSeed = serverSeed;
    this._serverSeedHash = serverSeedHash;
    this._crashPoint = crashPoint;
  }

  static generate(): ProvablyFair {
    const serverSeed = randomBytes(32).toString("hex");
    const serverSeedHash = createHash("sha256")
      .update(serverSeed)
      .digest("hex");
    const crashPoint = this.calculateCrashPoint(serverSeed);

    return new ProvablyFair(serverSeed, serverSeedHash, crashPoint);
  }

  static fromExisting(
    serverSeed: string,
    serverSeedHash: string,
    crashPoint: number
  ): ProvablyFair {
    return new ProvablyFair(serverSeed, serverSeedHash, crashPoint);
  }

  static verify(serverSeed: string, expectedHash: string): boolean {
    const calculatedHash = createHash("sha256")
      .update(serverSeed)
      .digest("hex");
    return calculatedHash === expectedHash;
  }

  static calculateCrashPoint(serverSeed: string): number {
    const hash = createHash("sha256").update(serverSeed).digest("hex");
    const resultNumber = parseInt(hash.substring(0, 13), 16);
    const maxValue = 2 ** 52;

    // 3% house edge (crash instantâneo)
    if (resultNumber % 33 === 0) {
      return 1.0;
    }

    // Fórmula do multiplicador
    const result = (100 * maxValue - resultNumber) / (maxValue - resultNumber);
    return Math.floor(result) / 100;
  }

  get serverSeed(): string {
    return this._serverSeed;
  }

  get serverSeedHash(): string {
    return this._serverSeedHash;
  }

  get crashPoint(): number {
    return this._crashPoint;
  }
}
