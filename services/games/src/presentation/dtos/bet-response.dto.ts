import type { Bet } from "@/domain";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class BetResponseDto {
  @ApiProperty({
    description: "Unique identifier of the bet",
    example: "550e8400-e29b-41d4-a716-446655440000"
  })
  id: string;

  @ApiProperty({
    description: "User ID who placed the bet",
    example: "123e4567-e89b-12d3-a456-426614174000"
  })
  userId: string;

  @ApiProperty({
    description: "Round ID where the bet was placed",
    example: "789e0123-e45b-67d8-a901-234567890000"
  })
  roundId: string;

  @ApiProperty({
    description: "Current status of the bet",
    enum: ["PENDING", "CASHED_OUT", "LOST"],
    example: "CASHED_OUT"
  })
  status: string;

  @ApiProperty({
    description: "Amount wagered in the bet (in currency units)",
    example: 10.5
  })
  amount: number;

  @ApiPropertyOptional({
    description:
      "Multiplier at which the player cashed out (null if not cashed out)",
    example: 2.5,
    nullable: true
  })
  cashoutMultiplier: number | null;

  @ApiPropertyOptional({
    description: "Payout amount received (null if bet was lost or pending)",
    example: 26.25,
    nullable: true
  })
  payout: number | null;

  @ApiProperty({
    description: "Timestamp when the bet was placed",
    example: "2024-01-15T10:30:00.000Z"
  })
  createdAt: Date;

  static fromDomain(bet: Bet): BetResponseDto {
    return {
      id: bet.id.toString(),
      userId: bet.userId.toString(),
      roundId: bet.roundId.toString(),
      status: bet.status,
      amount: Number(bet.amount.toCents()) / 100,
      cashoutMultiplier: bet.cashoutMultiplier,
      payout: bet.payout ? Number(bet.payout.toCents()) / 100 : null,
      createdAt: bet.createdAt
    };
  }
}
