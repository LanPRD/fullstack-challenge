import { RoundStatus } from "../enums";
import type { Optional } from "../types";
import { Entity } from "./entity";
import type { UniqueEntityId } from "./unique-entity-id";

export interface RoundProps {
  status: RoundStatus;
  serverSeed: string;
  serverSeedHash: string;
  crashPoint: number;
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

  static create(
    props: Optional<
      RoundProps,
      "createdAt" | "updatedAt" | "endedAt" | "crashedAt" | "status"
    >,
    id?: UniqueEntityId
  ): Round {
    return new Round(
      {
        status: RoundStatus.BETTING,
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
