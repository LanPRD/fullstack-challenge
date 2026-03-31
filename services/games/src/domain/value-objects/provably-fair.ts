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
    throw new Error("Not implemented");
  }

  static fromExisting(
    serverSeed: string,
    serverSeedHash: string,
    crashPoint: number
  ): ProvablyFair {
    return new ProvablyFair(serverSeed, serverSeedHash, crashPoint);
  }

  static verify(_serverSeed: string, _expectedHash: string): boolean {
    throw new Error("Not implemented");
  }

  static calculateCrashPoint(_serverSeed: string): number {
    throw new Error("Not implemented");
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
