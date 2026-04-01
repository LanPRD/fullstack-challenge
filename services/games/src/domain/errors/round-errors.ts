export class BettingPhaseEndedError extends Error {
  constructor() {
    super("Betting phase has ended");
    this.name = "BettingPhaseEndedError";
  }
}

export class RoundNotRunningError extends Error {
  constructor() {
    super("Round is not running");
    this.name = "RoundNotRunningError";
  }
}

export class BetNotFoundError extends Error {
  constructor() {
    super("Bet not found in this round");
    this.name = "BetNotFoundError";
  }
}

export class PlayerAlreadyBetError extends Error {
  constructor() {
    super("Player already placed a bet in this round");
    this.name = "PlayerAlreadyBetError";
  }
}

export class BetAlreadyCashedOutError extends Error {
  constructor() {
    super("Bet already cashed out");
    this.name = "BetAlreadyCashedOutError";
  }
}

export class RoundAlreadyCrashedError extends Error {
  constructor() {
    super("Round already crashed");
    this.name = "RoundAlreadyCrashedError";
  }
}
