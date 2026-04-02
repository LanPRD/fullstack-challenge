import {
  BadRequestException,
  InternalException,
  NotFoundException
} from "@/application/errors";
import { Round, RoundRepository, left, right, type Either } from "@/domain";
import { Injectable, Logger } from "@nestjs/common";

type StartRoundOutput = Either<
  BadRequestException | NotFoundException | InternalException,
  Round
>;

@Injectable()
export class StartRoundUseCase {
  private readonly _logger = new Logger(StartRoundUseCase.name);

  constructor(private readonly roundRepository: RoundRepository) {}

  async execute(): Promise<StartRoundOutput> {
    const round = await this.roundRepository.findCurrent();

    if (!round) {
      return left(new NotFoundException({ message: "No active round" }));
    }

    const startResult = round.startRound();

    if (startResult.isLeft()) {
      return left(
        new BadRequestException({ message: startResult.value.message })
      );
    }

    try {
      await this.roundRepository.save(round);
      return right(round);
    } catch (error) {
      this._logger.error(`Error starting round: ${error}`);
      return left(new InternalException({ message: "Error starting round" }));
    }
  }
}
