import { Bet, BetRepository, UniqueEntityId } from "@/domain";

export class InMemoryBetRepository implements BetRepository {
  private bets: Bet[] = [];

  async findById(id: UniqueEntityId): Promise<Bet | null> {
    return this.bets.find(b => b.id.toString() === id.toString()) ?? null;
  }

  async findByRoundId(roundId: UniqueEntityId): Promise<Bet[]> {
    return this.bets.filter(b => b.roundId.toString() === roundId.toString());
  }

  async findByUserId(userId: UniqueEntityId): Promise<Bet[]> {
    return this.bets.filter(b => b.userId.toString() === userId.toString());
  }

  async save(bet: Bet): Promise<void> {
    const index = this.bets.findIndex(
      b => b.id.toString() === bet.id.toString()
    );

    if (index >= 0) {
      this.bets[index] = bet;
    } else {
      this.bets.push(bet);
    }
  }

  async saveMany(bets: Bet[]): Promise<void> {
    for (const bet of bets) {
      await this.save(bet);
    }
  }

  clear(): void {
    this.bets = [];
  }

  addBet(bet: Bet): void {
    this.bets.push(bet);
  }

  getBets(): Bet[] {
    return this.bets;
  }
}
