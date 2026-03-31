import type { BetStatus } from "../enums";
import type { Optional } from "../types";
import { Entity } from "./entity";
import type { UniqueEntityId } from "./unique-entity-id";

export interface BetProps {
  userId: UniqueEntityId;
  status: BetStatus;
  amount: number;
  cashoutMultiplier: number | null;
  payout: bigint | null;
  createdAt: Date;
  updatedAt: Date;
  roundId: UniqueEntityId;
}

export class Bet extends Entity<BetProps> {
  get userId(): UniqueEntityId {
    return this.props.userId;
  }

  static create(
    props: Optional<
      BetProps,
      "createdAt" | "updatedAt" | "payout" | "cashoutMultiplier"
    >,
    id?: UniqueEntityId
  ): Bet {
    return new Bet(
      {
        payout: null,
        cashoutMultiplier: null,
        ...props,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      id
    );
  }
}
