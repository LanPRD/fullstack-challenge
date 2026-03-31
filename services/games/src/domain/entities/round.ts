import { RoundStatus } from "../enums";
import type { Optional } from "../types";
import { ProvablyFair } from "../value-objects";
import { Entity } from "./entity";
import type { UniqueEntityId } from "./unique-entity-id";

export interface RoundProps {
  status: RoundStatus;
  provablyFair: ProvablyFair;
  startedAt: Date;
  endedAt: Date | null;
  crashedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class Round extends Entity<RoundProps> {
  get status(): RoundStatus {
    return this.props.status;
  }

  get provablyFair(): ProvablyFair {
    return this.props.provablyFair;
  }

  static create(
    props: Optional<
      RoundProps,
      | "createdAt"
      | "updatedAt"
      | "endedAt"
      | "crashedAt"
      | "status"
      | "provablyFair"
    >,
    id?: UniqueEntityId
  ): Round {
    return new Round(
      {
        status: RoundStatus.BETTING,
        provablyFair: props.provablyFair ?? ProvablyFair.generate(),
        endedAt: null,
        crashedAt: null,
        ...props,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      id
    );
  }
}
