import {
  BadRequestException,
  InternalException,
  NotFoundException
} from "@/application/errors";
import {
  Round,
  left,
  right,
  type Either,
  type RoundRepository
} from "@/domain";
import { Injectable, Logger } from "@nestjs/common";

type CrashRoundOutput = Either<
  BadRequestException | NotFoundException | InternalException,
  Round
>;

@Injectable()
export class CrashRoundUseCase {
  private readonly _logger = new Logger(CrashRoundUseCase.name);

  constructor(private readonly roundRepository: RoundRepository) {}

  async execute(): Promise<CrashRoundOutput> {
    const round = await this.roundRepository.findCurrent();

    if (!round) {
      return left(new NotFoundException({ message: "No active round" }));
    }

    const crashResult = round.crash();

    if (crashResult.isLeft()) {
      return left(
        new BadRequestException({ message: crashResult.value.message })
      );
    }

    try {
      await this.roundRepository.save(round);
      return right(round);
    } catch (error) {
      this._logger.error(`Error crashing round: ${error}`);
      return left(new InternalException({ message: "Error crashing round" }));
    }
  }
}
