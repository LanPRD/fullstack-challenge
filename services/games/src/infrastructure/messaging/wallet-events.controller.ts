import { Controller, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { EventPattern, Payload } from "@nestjs/microservices";
import {
  WALLET_EVENTS,
  WalletCreditedEvent,
  WalletCreditFailedEvent,
  WalletDebitedEvent,
  WalletDebitFailedEvent
} from "./contracts";

@Controller()
export class WalletEventsController {
  private readonly _logger = new Logger(WalletEventsController.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  @EventPattern(WALLET_EVENTS.DEBITED)
  async handleWalletDebited(@Payload() event: WalletDebitedEvent) {
    this._logger.log(
      `Wallet debited: userId=${event.userId}, amount=${event.amount}, betId=${event.betId}`
    );

    // Emit internal event for use cases to handle
    this.eventEmitter.emit("wallet:debited", event);
  }

  @EventPattern(WALLET_EVENTS.DEBIT_FAILED)
  async handleWalletDebitFailed(@Payload() event: WalletDebitFailedEvent) {
    this._logger.warn(
      `Wallet debit failed: userId=${event.userId}, reason=${event.reason}, betId=${event.betId}`
    );

    // Emit internal event - use case should cancel/refund the bet
    this.eventEmitter.emit("wallet:debit_failed", event);
  }

  @EventPattern(WALLET_EVENTS.CREDITED)
  async handleWalletCredited(@Payload() event: WalletCreditedEvent) {
    this._logger.log(
      `Wallet credited: userId=${event.userId}, amount=${event.amount}, betId=${event.betId}`
    );

    // Emit internal event for use cases to handle
    this.eventEmitter.emit("wallet:credited", event);
  }

  @EventPattern(WALLET_EVENTS.CREDIT_FAILED)
  async handleWalletCreditFailed(@Payload() event: WalletCreditFailedEvent) {
    this._logger.error(
      `Wallet credit failed: userId=${event.userId}, reason=${event.reason}, betId=${event.betId}`
    );

    // Emit internal event - this is critical, needs manual intervention
    this.eventEmitter.emit("wallet:credit_failed", event);
  }
}
