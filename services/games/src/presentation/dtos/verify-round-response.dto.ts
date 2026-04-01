import { ApiProperty } from "@nestjs/swagger";

export class VerifyRoundResponseDto {
  @ApiProperty({
    description: "Unique identifier of the verified round",
    example: "550e8400-e29b-41d4-a716-446655440000"
  })
  roundId: string;

  @ApiProperty({
    description:
      "The server seed used to generate the crash point (revealed after crash)",
    example: "secret-server-seed-value-12345"
  })
  serverSeed: string;

  @ApiProperty({
    description:
      "SHA-256 hash of the server seed (can be verified against pre-game hash)",
    example:
      "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef12345678"
  })
  serverSeedHash: string;

  @ApiProperty({
    description: "The crash point multiplier for this round",
    example: 2.47
  })
  crashPoint: number;

  @ApiProperty({
    description: "Timestamp when the round crashed",
    example: "2024-01-15T10:30:15.000Z"
  })
  crashedAt: Date;
}
