import { Inject, Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import {
  WALLET_EVENTS,
  type WalletCreditFailedEvent,
  type WalletCreditedEvent,
  type WalletDebitFailedEvent,
  type WalletDebitedEvent
} from "./contracts/events";

@Injectable()
export class GamesEventService implements OnModuleDestroy {
  private readonly _logger = new Logger(GamesEventService.name);

  constructor(@Inject("GAMES_SERVICE") private readonly client: ClientProxy) {}

  async onModuleDestroy() {
    await this.client.close();
  }

  async emitDebited(event: WalletDebitedEvent): Promise<void> {
    this._logger.log(`Emitting ${WALLET_EVENTS.DEBITED}: betId=${event.betId}`);
    this.client.emit(WALLET_EVENTS.DEBITED, event);
  }

  async emitDebitFailed(event: WalletDebitFailedEvent): Promise<void> {
    this._logger.warn(
      `Emitting ${WALLET_EVENTS.DEBIT_FAILED}: betId=${event.betId}, reason=${event.reason}`
    );
    this.client.emit(WALLET_EVENTS.DEBIT_FAILED, event);
  }

  async emitCredited(event: WalletCreditedEvent): Promise<void> {
    this._logger.log(`Emitting ${WALLET_EVENTS.CREDITED}: betId=${event.betId}`);
    this.client.emit(WALLET_EVENTS.CREDITED, event);
  }

  async emitCreditFailed(event: WalletCreditFailedEvent): Promise<void> {
    this._logger.error(
      `Emitting ${WALLET_EVENTS.CREDIT_FAILED}: betId=${event.betId}, reason=${event.reason}`
    );
    this.client.emit(WALLET_EVENTS.CREDIT_FAILED, event);
  }
}
