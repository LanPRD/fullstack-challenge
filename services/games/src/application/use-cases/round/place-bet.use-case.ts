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
  UniqueEntityId,
  type Either,
  type RoundRepository
} from "@/domain";
import { Injectable, Logger } from "@nestjs/common";

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

  constructor(private readonly roundRepository: RoundRepository) {}

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
      return right(betResult.value);
    } catch (error) {
      this._logger.error(`Error placing bet: ${error}`);
      return left(new InternalException({ message: "Error placing bet" }));
    }
  }
}
