import { Money, UniqueEntityId, WalletRepository } from "@/domain";
import type { DebitWalletCommand } from "@/infrastructure/messaging/contracts/commands";
import type { GamesEventService } from "@/infrastructure/messaging/games-event.service";
import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class DebitWalletUseCase {
  private readonly _logger = new Logger(DebitWalletUseCase.name);

  constructor(
    private readonly walletRepository: WalletRepository,
    private readonly gamesEventService: GamesEventService
  ) {}

  async execute(command: DebitWalletCommand): Promise<void> {
    const wallet = await this.walletRepository.findByUserId(
      new UniqueEntityId(command.userId)
    );

    if (!wallet) {
      this._logger.warn(`Wallet not found for userId=${command.userId}, betId=${command.betId}`);
      await this.gamesEventService.emitDebitFailed({
        correlationId: command.correlationId,
        userId: command.userId,
        amount: command.amount,
        roundId: command.roundId,
        betId: command.betId,
        reason: "wallet_not_found"
      });
      return;
    }

    const amountResult = Money.fromCents(BigInt(command.amount));

    if (amountResult.isLeft()) {
      await this.gamesEventService.emitDebitFailed({
        correlationId: command.correlationId,
        userId: command.userId,
        amount: command.amount,
        roundId: command.roundId,
        betId: command.betId,
        reason: "internal_error"
      });
      return;
    }

    const debitResult = wallet.debit(amountResult.value);

    if (debitResult.isLeft()) {
      this._logger.warn(`Insufficient funds: userId=${command.userId}, amount=${command.amount}`);
      await this.gamesEventService.emitDebitFailed({
        correlationId: command.correlationId,
        userId: command.userId,
        amount: command.amount,
        roundId: command.roundId,
        betId: command.betId,
        reason: "insufficient_funds"
      });
      return;
    }

    try {
      await this.walletRepository.save(wallet);

      await this.gamesEventService.emitDebited({
        correlationId: command.correlationId,
        userId: command.userId,
        amount: command.amount,
        roundId: command.roundId,
        betId: command.betId,
        newBalance: wallet.balance.toNumber()
      });

      this._logger.log(`Debited userId=${command.userId}, amount=${command.amount}`);
    } catch (error) {
      this._logger.error(`Error saving wallet after debit: ${error}`);
      await this.gamesEventService.emitDebitFailed({
        correlationId: command.correlationId,
        userId: command.userId,
        amount: command.amount,
        roundId: command.roundId,
        betId: command.betId,
        reason: "internal_error"
      });
    }
  }
}
