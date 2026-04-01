import { Round, RoundRepository, UniqueEntityId } from "@/domain";
import { Injectable } from "@nestjs/common";

@Injectable()
export class InMemoryRoundRepository implements RoundRepository {
  private rounds: Round[] = [];

  async findById(id: UniqueEntityId): Promise<Round | null> {
    return this.rounds.find(r => r.id.toString() === id.toString()) ?? null;
  }

  async findCurrent(): Promise<Round | null> {
    return this.rounds.find(r => r.isBetting || r.isRunning) ?? null;
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
}
