import {
  BadRequestException,
  InternalException,
  NotFoundException
} from "@/application/errors";
import {
  Bet,
  RoundRepository,
  UniqueEntityId,
  left,
  right,
  type Either
} from "@/domain";
import { WalletClientService } from "@/infrastructure/messaging";
import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

interface CashoutInput {
  betId: string;
  multiplier: number;
}

type CashoutOutput = Either<
  BadRequestException | NotFoundException | InternalException,
  Bet
>;

@Injectable()
export class CashoutUseCase {
  private readonly _logger = new Logger(CashoutUseCase.name);

  constructor(
    private readonly roundRepository: RoundRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly walletClient: WalletClientService
  ) {}

  async execute({ betId, multiplier }: CashoutInput): Promise<CashoutOutput> {
    const round = await this.roundRepository.findCurrent();

    if (!round) {
      return left(new NotFoundException({ message: "No active round" }));
    }

    const cashoutResult = round.cashout(new UniqueEntityId(betId), multiplier);

    if (cashoutResult.isLeft()) {
      const error = cashoutResult.value;

      if (error.name === "BetNotFoundError") {
        return left(new NotFoundException({ message: "Bet not found" }));
      }

      return left(new BadRequestException({ message: error.message }));
    }

    try {
      await this.roundRepository.save(round);

      const bet = cashoutResult.value;

      if (bet.payout) {
        await this.walletClient.credit({
          userId: bet.userId.toString(),
          amount: Number(bet.payout.toCents()),
          roundId: round.id.toString(),
          betId: bet.id.toString(),
          reason: "cashout"
        });
      }

      this.eventEmitter.emit("bet:cashedout", {
        roundId: round.id.toString(),
        betId: bet.id.toString(),
        userId: bet.userId.toString(),
        multiplier: bet.cashoutMultiplier,
        payout:
          bet.payout ?
            (Number(bet.payout.toCents()) / 100).toString()
          : undefined
      });

      return right(bet);
    } catch (error) {
      this._logger.error(`Error processing cashout: ${error}`);
      return left(
        new InternalException({ message: "Error processing cashout" })
      );
    }
  }
}
