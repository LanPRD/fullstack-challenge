import type { Bet, UniqueEntityId } from "../entities";

export abstract class BetRepository {
  abstract findById(id: UniqueEntityId): Promise<Bet | null>;
  abstract findByRoundId(roundId: UniqueEntityId): Promise<Bet[]>;
  abstract findByUserId(userId: UniqueEntityId): Promise<Bet[]>;
  abstract save(bet: Bet): Promise<void>;
  abstract saveMany(bets: Bet[]): Promise<void>;
}
