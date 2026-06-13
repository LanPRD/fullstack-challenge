import {
  CreditWalletUseCase,
  DebitWalletUseCase
} from "@/application/use-cases/wallet";
import { Controller, Logger } from "@nestjs/common";
import { EventPattern, MessagePattern, Payload } from "@nestjs/microservices";
import {
  WALLET_COMMANDS,
  type CreditWalletCommand,
  type DebitWalletCommand
} from "./contracts/commands";

@Controller()
export class GameCommandsController {
  private readonly _logger = new Logger(GameCommandsController.name);

  constructor(
    private readonly debitWalletUseCase: DebitWalletUseCase,
    private readonly creditWalletUseCase: CreditWalletUseCase
  ) {}

  @MessagePattern(WALLET_COMMANDS.DEBIT)
  async handleDebit(@Payload() command: DebitWalletCommand): Promise<{ success: boolean; reason?: string }> {
    this._logger.log(
      `Received debit command: userId=${command.userId}, amount=${command.amount}, betId=${command.betId}`
    );
    return this.debitWalletUseCase.execute(command);
  }

  @EventPattern(WALLET_COMMANDS.CREDIT)
  async handleCredit(@Payload() command: CreditWalletCommand): Promise<void> {
    this._logger.log(
      `Received credit command: userId=${command.userId}, amount=${command.amount}, betId=${command.betId}, reason=${command.reason}`
    );
    await this.creditWalletUseCase.execute(command);
  }
}
