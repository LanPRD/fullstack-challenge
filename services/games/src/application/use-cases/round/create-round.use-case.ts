import { InternalException } from "@/application/errors";
import { Round, RoundRepository, left, right, type Either } from "@/domain";
import { Injectable, Logger } from "@nestjs/common";

type CreateRoundOutput = Either<InternalException, Round>;

@Injectable()
export class CreateRoundUseCase {
  private readonly _logger = new Logger(CreateRoundUseCase.name);

  constructor(private readonly roundRepository: RoundRepository) {}

  async execute(): Promise<CreateRoundOutput> {
    const round = Round.create({ startedAt: new Date() });

    try {
      await this.roundRepository.save(round);
      return right(round);
    } catch (error) {
      this._logger.error(`Error creating round: ${error}`);
      return left(new InternalException({ message: "Error creating round" }));
    }
  }
}
