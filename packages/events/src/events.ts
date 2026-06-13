export interface WalletDebitedEvent {
  correlationId: string;
  userId: string;
  amount: number;
  roundId: string;
  betId: string;
  newBalance: number;
}

export interface WalletDebitFailedEvent {
  correlationId: string;
  userId: string;
  amount: number;
  roundId: string;
  betId: string;
  reason: "insufficient_funds" | "wallet_not_found" | "internal_error";
}

export interface WalletCreditedEvent {
  correlationId: string;
  userId: string;
  amount: number;
  roundId: string;
  betId: string;
  newBalance: number;
}

export interface WalletCreditFailedEvent {
  correlationId: string;
  userId: string;
  amount: number;
  roundId: string;
  betId: string;
  reason: "wallet_not_found" | "internal_error";
}

export const WALLET_EVENTS = {
  DEBITED: "wallet.debited",
  DEBIT_FAILED: "wallet.debit.failed",
  CREDITED: "wallet.credited",
  CREDIT_FAILED: "wallet.credit.failed",
} as const;
