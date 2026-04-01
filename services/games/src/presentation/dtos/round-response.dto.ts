import type { Round } from "@/domain";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { BetResponseDto } from "./bet-response.dto";

export class RoundResponseDto {
  @ApiProperty({
    description: "Unique identifier of the round",
    example: "550e8400-e29b-41d4-a716-446655440000"
  })
  id: string;

  @ApiProperty({
    description: "Current status of the round",
    enum: ["BETTING", "RUNNING", "CRASHED"],
    example: "CRASHED"
  })
  status: string;

  @ApiProperty({
    description:
      "SHA-256 hash of the server seed for provably fair verification",
    example:
      "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef12345678"
  })
  serverSeedHash: string;

  @ApiPropertyOptional({
    description:
      "The multiplier at which the round crashed (only visible after crash)",
    example: 2.47,
    nullable: true
  })
  crashPoint: number | null;

  @ApiProperty({
    description: "Timestamp when the round started",
    example: "2024-01-15T10:30:00.000Z"
  })
  startedAt: Date;

  @ApiPropertyOptional({
    description: "Timestamp when the round crashed (null if still active)",
    example: "2024-01-15T10:30:15.000Z",
    nullable: true
  })
  crashedAt: Date | null;

  @ApiProperty({
    description: "Timestamp when the round was created",
    example: "2024-01-15T10:29:45.000Z"
  })
  createdAt: Date;

  @ApiPropertyOptional({
    description: "List of bets placed in this round (only included on request)",
    type: [BetResponseDto],
    isArray: true
  })
  bets?: BetResponseDto[];

  static fromDomain(round: Round, includeBets = false): RoundResponseDto {
    const dto: RoundResponseDto = {
      id: round.id.toString(),
      status: round.status,
      serverSeedHash: round.provablyFair.serverSeedHash,
      crashPoint: round.isCrashed ? round.crashPoint : null,
      startedAt: round.startedAt,
      crashedAt: round.crashedAt,
      createdAt: round.createdAt
    };

    if (includeBets) {
      dto.bets = round.bets.map(BetResponseDto.fromDomain);
    }

    return dto;
  }
}
