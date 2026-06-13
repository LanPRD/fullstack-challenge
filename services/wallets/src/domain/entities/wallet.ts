import { left, right, type Either } from "../either";
import { InsufficientFundsError } from "../errors";
import type { Optional } from "../types";
import type { Money } from "../value-objects";
import { Entity } from "./entity";
import type { UniqueEntityId } from "./unique-entity-id";

export interface WalletProps {
  userId: UniqueEntityId;
  balance: Money;
  createdAt: Date;
  updatedAt: Date;
}

export class Wallet extends Entity<WalletProps> {
  get userId(): UniqueEntityId {
    return this.props.userId;
  }

  get balance(): Money {
    return this.props.balance;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  credit(amount: Money): void {
    this.props.balance = this.props.balance.add(amount);
    this.props.updatedAt = new Date();
  }

  debit(amount: Money): Either<InsufficientFundsError, void> {
    const result = this.props.balance.subtract(amount);

    if (result.isLeft()) {
      return left(new InsufficientFundsError());
    }

    this.props.balance = result.value;
    this.props.updatedAt = new Date();
    return right(undefined);
  }

  static create(
    props: Optional<WalletProps, "createdAt" | "updatedAt">,
    id?: UniqueEntityId
  ): Wallet {
    return new Wallet(
      {
        ...props,
        createdAt: props.createdAt ?? new Date(),
        updatedAt: props.updatedAt ?? new Date()
      },
      id
    );
  }
}
