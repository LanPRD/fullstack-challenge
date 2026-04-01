import type { Bet, UniqueEntityId } from "../entities";
import type { PaginatedResult, PaginationOptions } from "./round-repository";

export abstract class BetRepository {
  abstract findById(id: UniqueEntityId): Promise<Bet | null>;
  abstract findByRoundId(roundId: UniqueEntityId): Promise<Bet[]>;
  abstract findByUserId(
    userId: UniqueEntityId,
    options: PaginationOptions
  ): Promise<PaginatedResult<Bet>>;
  abstract save(bet: Bet): Promise<void>;
  abstract saveMany(bets: Bet[]): Promise<void>;
}
