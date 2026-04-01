import { NotFoundException } from "@/application/errors";
import {
  Round,
  left,
  right,
  type Either,
  type RoundRepository
} from "@/domain";
import { Injectable } from "@nestjs/common";

type GetCurrentRoundOutput = Either<NotFoundException, Round>;

@Injectable()
export class GetCurrentRoundUseCase {
  constructor(private readonly roundRepository: RoundRepository) {}

  async execute(): Promise<GetCurrentRoundOutput> {
    const round = await this.roundRepository.findCurrent();

    if (!round) {
      return left(new NotFoundException({ message: "No active round found" }));
    }

    return right(round);
  }
}
