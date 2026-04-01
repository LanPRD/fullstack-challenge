import { InternalException } from "@/application/errors";
import {
  Round,
  left,
  right,
  type Either,
  type PaginatedResult,
  type RoundRepository
} from "@/domain";
import { Injectable, Logger } from "@nestjs/common";

interface GetRoundsHistoryInput {
  limit?: number;
  offset?: number;
}

type GetRoundsHistoryOutput = Either<InternalException, PaginatedResult<Round>>;

@Injectable()
export class GetRoundsHistoryUseCase {
  private readonly _logger = new Logger(GetRoundsHistoryUseCase.name);

  constructor(private readonly roundRepository: RoundRepository) {}

  async execute(input: GetRoundsHistoryInput): Promise<GetRoundsHistoryOutput> {
    const { limit = 20, offset = 0 } = input;

    try {
      const result = await this.roundRepository.findMany({ limit, offset });
      return right(result);
    } catch (error) {
      this._logger.error(`Error fetching rounds history: ${error}`);
      return left(
        new InternalException({ message: "Error fetching rounds history" })
      );
    }
  }
}
