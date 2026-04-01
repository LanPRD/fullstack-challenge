import type { Round } from "@/domain";
import { BetResponseDto } from "./bet-response.dto";

export class RoundResponseDto {
  id: string;
  status: string;
  serverSeedHash: string;
  crashPoint: number | null;
  startedAt: Date;
  crashedAt: Date | null;
  createdAt: Date;
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
