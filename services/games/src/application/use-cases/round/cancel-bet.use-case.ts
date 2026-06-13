import { BetRepository, UniqueEntityId } from "@/domain";
import type { WalletDebitFailedEvent } from "@/infrastructure/messaging/contracts/events";
import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter2, OnEvent } from "@nestjs/event-emitter";

@Injectable()
export class CancelBetUseCase {
  private readonly _logger = new Logger(CancelBetUseCase.name);

  constructor(
    private readonly betRepository: BetRepository,
    private readonly eventEmitter: EventEmitter2
  ) {}

  @OnEvent("wallet:debit_failed")
  async handle(event: WalletDebitFailedEvent): Promise<void> {
    const bet = await this.betRepository.findById(
      new UniqueEntityId(event.betId)
    );

    if (!bet) {
      this._logger.error(
        `Cannot cancel bet: betId=${event.betId} not found. userId=${event.userId}, reason=${event.reason}`
      );
      return;
    }

    if (!bet.isPending) {
      this._logger.warn(
        `Bet ${event.betId} is not PENDING (status=${bet.status}), skipping cancel`
      );
      return;
    }

    bet.cancel();
    await this.betRepository.save(bet);

    this._logger.warn(
      `Bet cancelled: betId=${event.betId}, userId=${event.userId}, reason=${event.reason}`
    );

    this.eventEmitter.emit("bet:cancelled", {
      betId: event.betId,
      userId: event.userId,
      reason: event.reason
    });
  }
}
