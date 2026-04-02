export interface DebitWalletCommand {
  correlationId: string;
  userId: string;
  amount: number; // in cents
  roundId: string;
  betId: string;
}

export interface CreditWalletCommand {
  correlationId: string;
  userId: string;
  amount: number; // in cents
  roundId: string;
  betId: string;
  reason: "cashout" | "refund";
}

export const WALLET_COMMANDS = {
  DEBIT: "wallet.debit",
  CREDIT: "wallet.credit"
} as const;
