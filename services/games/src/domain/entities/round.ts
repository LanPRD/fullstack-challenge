import { left, right, type Either } from "../either";
import { RoundStatus } from "../enums";
import {
  BetAlreadyCashedOutError,
  BetNotFoundError,
  BettingPhaseEndedError,
  PlayerAlreadyBetError,
  RoundAlreadyCrashedError,
  RoundNotRunningError
} from "../errors";
import type { Optional } from "../types";
import type { Money } from "../value-objects";
import { ProvablyFair } from "../value-objects";
import { Bet } from "./bet";
import { Entity } from "./entity";
import { UniqueEntityId } from "./unique-entity-id";

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
  private _bets: Bet[] = [];

  get status(): RoundStatus {
    return this.props.status;
  }

  set status(value: RoundStatus) {
    this.props.status = value;
    this.props.updatedAt = new Date();
  }

  get crashedAt(): Date | null {
    return this.props.crashedAt;
  }

  set crashedAt(value: Date | null) {
    this.props.crashedAt = value;
    this.props.updatedAt = new Date();
  }

  get endedAt(): Date | null {
    return this.props.endedAt;
  }

  set endedAt(value: Date | null) {
    this.props.endedAt = value;
    this.props.updatedAt = new Date();
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  set updatedAt(value: Date) {
    this.props.updatedAt = value;
  }

  get startedAt(): Date {
    return this.props.startedAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get provablyFair(): ProvablyFair {
    return this.props.provablyFair;
  }

  get crashPoint(): number {
    return this.provablyFair.crashPoint;
  }

  get bets(): Bet[] {
    return this._bets;
  }

  get isBetting(): boolean {
    return this.status === RoundStatus.BETTING;
  }

  get isRunning(): boolean {
    return this.status === RoundStatus.RUNNING;
  }

  get isCrashed(): boolean {
    return this.status === RoundStatus.CRASHED;
  }

  placeBet(
    userId: UniqueEntityId,
    amount: Money
  ): Either<BettingPhaseEndedError | PlayerAlreadyBetError, Bet> {
    if (!this.isBetting) {
      return left(new BettingPhaseEndedError());
    }

    const existingBet = this._bets.find(
      bet => bet.userId.toString() === userId.toString()
    );

    if (existingBet) {
      return left(new PlayerAlreadyBetError());
    }

    const bet = Bet.create({
      userId,
      amount,
      roundId: this.id
    });

    this._bets.push(bet);
    this.updatedAt = new Date();

    return right(bet);
  }

  startRound(): Either<BettingPhaseEndedError, void> {
    if (!this.isBetting) {
      return left(new BettingPhaseEndedError());
    }

    this.status = RoundStatus.RUNNING;
    this.updatedAt = new Date();

    return right(undefined);
  }

  cashout(
    betId: UniqueEntityId,
    currentMultiplier: number
  ): Either<
    RoundNotRunningError | BetNotFoundError | BetAlreadyCashedOutError,
    Bet
  > {
    if (!this.isRunning) {
      return left(new RoundNotRunningError());
    }

    const bet = this._bets.find(b => b.id.toString() === betId.toString());

    if (!bet) {
      return left(new BetNotFoundError());
    }

    if (!bet.isPending) {
      return left(new BetAlreadyCashedOutError());
    }

    bet.applyCashout(currentMultiplier);

    this.updatedAt = new Date();

    return right(bet);
  }

  crash(): Either<RoundAlreadyCrashedError, void> {
    if (this.isCrashed) {
      return left(new RoundAlreadyCrashedError());
    }

    this.status = RoundStatus.CRASHED;
    this.crashedAt = new Date();
    this.endedAt = new Date();

    // Mark all pending bets as lost
    this._bets.filter(bet => bet.isPending).forEach(bet => bet.markAsLost());

    return right(undefined);
  }

  addBet(bet: Bet): void {
    this._bets.push(bet);
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
