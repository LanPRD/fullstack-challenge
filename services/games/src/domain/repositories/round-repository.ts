import type { Round, UniqueEntityId } from "../entities";

export abstract class RoundRepository {
  abstract findById(id: UniqueEntityId): Promise<Round | null>;
  abstract findCurrent(): Promise<Round | null>;
  abstract save(round: Round): Promise<Round>;
}
