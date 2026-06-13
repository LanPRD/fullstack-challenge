import { Round, UniqueEntityId, type RoundProps } from "@/domain";

export class RoundFactory {
  static build(
    overrides: Partial<RoundProps> = {},
    id?: UniqueEntityId
  ): Round {
    return Round.create(
      {
        startedAt: new Date(),
        ...overrides
      },
      id ?? new UniqueEntityId()
    );
  }
}
