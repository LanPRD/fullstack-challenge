import { Money, UniqueEntityId, WalletRepository } from "@/domain";
import type { CreditWalletCommand } from "@/infrastructure/messaging/contracts/commands";
import { GamesEventService } from "@/infrastructure/messaging/games-event.service";
import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class CreditWalletUseCase {
  private readonly _logger = new Logger(CreditWalletUseCase.name);

  constructor(
    private readonly walletRepository: WalletRepository,
    private readonly gamesEventService: GamesEventService
  ) {}

  async execute(command: CreditWalletCommand): Promise<void> {
    const wallet = await this.walletRepository.findByUserId(
      new UniqueEntityId(command.userId)
    );

    if (!wallet) {
      this._logger.warn(
        `Wallet not found for userId=${command.userId}, betId=${command.betId}`
      );
      await this.gamesEventService.emitCreditFailed({
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
      await this.gamesEventService.emitCreditFailed({
        correlationId: command.correlationId,
        userId: command.userId,
        amount: command.amount,
        roundId: command.roundId,
        betId: command.betId,
        reason: "internal_error"
      });
      return;
    }

    wallet.credit(amountResult.value);

    try {
      await this.walletRepository.save(wallet);

      await this.gamesEventService.emitCredited({
        correlationId: command.correlationId,
        userId: command.userId,
        amount: command.amount,
        roundId: command.roundId,
        betId: command.betId,
        newBalance: wallet.balance.toNumber()
      });

      this._logger.log(
        `Credited userId=${command.userId}, amount=${command.amount}, reason=${command.reason}`
      );
    } catch (error) {
      this._logger.error(`Error saving wallet after credit: ${error}`);
      await this.gamesEventService.emitCreditFailed({
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
