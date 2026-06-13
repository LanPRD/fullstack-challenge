export class InsufficientFundsError extends Error {
  constructor() {
    super("Insufficient funds");
    this.name = "InsufficientFundsError";
  }
}

export class WalletAlreadyExistsError extends Error {
  constructor() {
    super("Wallet already exists for this user");
    this.name = "WalletAlreadyExistsError";
  }
}

export class WalletNotFoundError extends Error {
  constructor() {
    super("Wallet not found");
    this.name = "WalletNotFoundError";
  }
}
