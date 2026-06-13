import { Inject, Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { randomUUID } from "node:crypto";
import { firstValueFrom } from "rxjs";
import {
  type CreditWalletCommand,
  type DebitWalletCommand,
  WALLET_COMMANDS
} from "./contracts/commands";

@Injectable()
export class WalletClientService implements OnModuleDestroy {
  private readonly _logger = new Logger(WalletClientService.name);

  constructor(@Inject("WALLET_SERVICE") private readonly client: ClientProxy) {}

  async onModuleDestroy() {
    await this.client.close();
  }

  async debit(params: {
    userId: string;
    amount: number;
    roundId: string;
    betId: string;
  }): Promise<{ success: boolean; reason?: string }> {
    const correlationId = randomUUID();

    const command: DebitWalletCommand = {
      correlationId,
      userId: params.userId,
      amount: params.amount,
      roundId: params.roundId,
      betId: params.betId
    };

    this._logger.log(`Sending debit command: ${JSON.stringify(command)}`);

    return firstValueFrom(
      this.client.send<{ success: boolean; reason?: string }>(
        WALLET_COMMANDS.DEBIT,
        command
      )
    );
  }

  async credit(params: {
    userId: string;
    amount: number;
    roundId: string;
    betId: string;
    reason: "cashout" | "refund";
  }): Promise<string> {
    const correlationId = randomUUID();

    const command: CreditWalletCommand = {
      correlationId,
      userId: params.userId,
      amount: params.amount,
      roundId: params.roundId,
      betId: params.betId,
      reason: params.reason
    };

    this._logger.log(`Sending credit command: ${JSON.stringify(command)}`);

    this.client.emit(WALLET_COMMANDS.CREDIT, command);

    return correlationId;
  }
}
