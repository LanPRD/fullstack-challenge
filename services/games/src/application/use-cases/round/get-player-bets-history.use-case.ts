import { InternalException } from "@/application/errors";
import {
  Bet,
  UniqueEntityId,
  left,
  right,
  type BetRepository,
  type Either,
  type PaginatedResult
} from "@/domain";
import { Injectable, Logger } from "@nestjs/common";

interface GetPlayerBetsHistoryInput {
  userId: string;
  limit?: number;
  offset?: number;
}

type GetPlayerBetsHistoryOutput = Either<
  InternalException,
  PaginatedResult<Bet>
>;

@Injectable()
export class GetPlayerBetsHistoryUseCase {
  private readonly _logger = new Logger(GetPlayerBetsHistoryUseCase.name);

  constructor(private readonly betRepository: BetRepository) {}

  async execute(
    input: GetPlayerBetsHistoryInput
  ): Promise<GetPlayerBetsHistoryOutput> {
    const { userId, limit = 20, offset = 0 } = input;

    try {
      const result = await this.betRepository.findByUserId(
        new UniqueEntityId(userId),
        { limit, offset }
      );
      return right(result);
    } catch (error) {
      this._logger.error(`Error fetching player bets history: ${error}`);
      return left(
        new InternalException({ message: "Error fetching player bets history" })
      );
    }
  }
}
