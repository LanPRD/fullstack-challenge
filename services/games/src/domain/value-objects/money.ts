import { left, right, type Either } from "../either";

export class InvalidMoneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidMoneyError";
  }
}

export class Money {
  private readonly cents: bigint;

  private constructor(cents: bigint) {
    this.cents = cents;
  }

  static fromCents(cents: bigint): Either<InvalidMoneyError, Money> {
    if (cents < 0n) {
      return left(new InvalidMoneyError("Money cannot be negative"));
    }

    return right(new Money(cents));
  }

  toCents(): bigint {
    return this.cents;
  }

  toNumber(): number {
    return Number(this.cents);
  }

  add(other: Money): Money {
    return new Money(this.cents + other.cents);
  }

  subtract(other: Money): Either<InvalidMoneyError, Money> {
    if (other.cents > this.cents) {
      return left(new InvalidMoneyError("Insufficient funds"));
    }

    return right(new Money(this.cents - other.cents));
  }

  multiply(multiplier: number): Money {
    const result = BigInt(Math.floor(this.toNumber() * multiplier));
    return new Money(result);
  }

  equals(other: Money): boolean {
    return this.cents === other.cents;
  }
}
