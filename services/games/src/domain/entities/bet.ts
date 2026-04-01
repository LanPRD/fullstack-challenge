import { BetStatus } from "../enums";
import type { Optional } from "../types";
import type { Money } from "../value-objects";
import { Entity } from "./entity";
import type { UniqueEntityId } from "./unique-entity-id";

export interface BetProps {
  userId: UniqueEntityId;
  status: BetStatus;
  amount: Money;
  cashoutMultiplier: number | null;
  payout: Money | null;
  createdAt: Date;
  updatedAt: Date;
  roundId: UniqueEntityId;
}

export class Bet extends Entity<BetProps> {
  get userId(): UniqueEntityId {
    return this.props.userId;
  }

  get status(): BetStatus {
    return this.props.status;
  }

  set status(value: BetStatus) {
    this.props.status = value;
    this.props.updatedAt = new Date();
  }

  get amount(): Money {
    return this.props.amount;
  }

  set amount(value: Money) {
    this.props.amount = value;
    this.props.updatedAt = new Date();
  }

  get cashoutMultiplier(): number | null {
    return this.props.cashoutMultiplier;
  }

  set cashoutMultiplier(value: number | null) {
    this.props.cashoutMultiplier = value;
    this.props.updatedAt = new Date();
  }

  get payout(): Money | null {
    return this.props.payout;
  }

  set payout(value: Money | null) {
    this.props.payout = value;
    this.props.updatedAt = new Date();
  }

  get roundId(): UniqueEntityId {
    return this.props.roundId;
  }

  get isPending(): boolean {
    return this.props.status === BetStatus.PENDING;
  }

  get isCashedOut(): boolean {
    return this.props.status === BetStatus.CASHED_OUT;
  }

  get isLost(): boolean {
    return this.props.status === BetStatus.LOST;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  applyCashout(multiplier: number): void {
    this.cashoutMultiplier = multiplier;
    this.payout = this.amount.multiply(multiplier);
    this.status = BetStatus.CASHED_OUT;
  }

  markAsLost(): void {
    this.status = BetStatus.LOST;
  }

  static create(
    props: Optional<
      BetProps,
      "createdAt" | "updatedAt" | "payout" | "cashoutMultiplier" | "status"
    >,
    id?: UniqueEntityId
  ): Bet {
    return new Bet(
      {
        status: BetStatus.PENDING,
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
