export class VerifyRoundResponseDto {
  roundId: string;
  serverSeed: string;
  serverSeedHash: string;
  crashPoint: number;
  crashedAt: Date;
}
