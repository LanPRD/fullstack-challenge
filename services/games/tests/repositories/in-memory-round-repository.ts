import {
  Round,
  RoundRepository,
  UniqueEntityId,
  type PaginatedResult,
  type PaginationOptions
} from "@/domain";

export class InMemoryRoundRepository implements RoundRepository {
  private rounds: Round[] = [];

  async findById(id: UniqueEntityId): Promise<Round | null> {
    return this.rounds.find(r => r.id.toString() === id.toString()) ?? null;
  }

  async findCurrent(): Promise<Round | null> {
    return this.rounds.find(r => r.isBetting || r.isRunning) ?? null;
  }

  async findMany(options: PaginationOptions): Promise<PaginatedResult<Round>> {
    const { limit, offset } = options;
    const crashedRounds = this.rounds
      .filter(r => r.isCrashed)
      .sort((a, b) => b.crashedAt!.getTime() - a.crashedAt!.getTime());

    return {
      data: crashedRounds.slice(offset, offset + limit),
      total: crashedRounds.length,
      limit,
      offset
    };
  }

  async save(round: Round): Promise<void> {
    const index = this.rounds.findIndex(
      r => r.id.toString() === round.id.toString()
    );

    if (index >= 0) {
      this.rounds[index] = round;
    } else {
      this.rounds.push(round);
    }
  }

  clear(): void {
    this.rounds = [];
  }

  getRounds(): Round[] {
    return this.rounds;
  }

  addRound(round: Round): void {
    this.rounds.push(round);
  }
}
