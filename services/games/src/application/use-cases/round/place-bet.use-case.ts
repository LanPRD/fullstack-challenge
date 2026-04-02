import {
  BadRequestException,
  InternalException,
  NotFoundException
} from "@/application/errors";
import {
  Bet,
  BET_LIMITS,
  left,
  Money,
  right,
  RoundRepository,
  UniqueEntityId,
  type Either
} from "@/domain";
import { WalletClientService } from "@/infrastructure/messaging";
import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

interface PlaceBetInput {
  userId: string;
  amount: number;
}

type PlaceBetOutput = Either<
  BadRequestException | NotFoundException | InternalException,
  Bet
>;

@Injectable()
export class PlaceBetUseCase {
  private readonly _logger = new Logger(PlaceBetUseCase.name);

  constructor(
    private readonly roundRepository: RoundRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly walletClient: WalletClientService
  ) {}

  async execute({ userId, amount }: PlaceBetInput): Promise<PlaceBetOutput> {
    const amountInCents = BigInt(amount);

    if (
      amountInCents < BET_LIMITS.MIN_CENTS ||
      amountInCents > BET_LIMITS.MAX_CENTS
    ) {
      return left(
        new BadRequestException({
          message: `Bet must be between ${BET_LIMITS.MIN_CENTS} and ${BET_LIMITS.MAX_CENTS} cents`
        })
      );
    }

    const moneyResult = Money.fromCents(amountInCents);

    if (moneyResult.isLeft()) {
      return left(new BadRequestException({ message: "Invalid amount" }));
    }

    const round = await this.roundRepository.findCurrent();

    if (!round) {
      return left(new NotFoundException({ message: "No active round" }));
    }

    const betResult = round.placeBet(
      new UniqueEntityId(userId),
      moneyResult.value
    );

    if (betResult.isLeft()) {
      return left(
        new BadRequestException({ message: betResult.value.message })
      );
    }

    try {
      await this.roundRepository.save(round);

      const bet = betResult.value;

      await this.walletClient.debit({
        userId: bet.userId.toString(),
        amount: Number(bet.amount.toCents()),
        roundId: round.id.toString(),
        betId: bet.id.toString()
      });

      this.eventEmitter.emit("bet:placed", {
        roundId: round.id.toString(),
        betId: bet.id.toString(),
        userId: bet.userId.toString(),
        amount: bet.amount.toCents().toString()
      });

      return right(bet);
    } catch (error) {
      this._logger.error(`Error placing bet: ${error}`);
      return left(new InternalException({ message: "Error placing bet" }));
    }
  }
}
