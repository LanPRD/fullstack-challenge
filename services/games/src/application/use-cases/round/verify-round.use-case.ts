import { BadRequestException, NotFoundException } from "@/application/errors";
import {
  UniqueEntityId,
  left,
  right,
  type Either,
  type RoundRepository
} from "@/domain";
import { Injectable } from "@nestjs/common";

interface VerifyRoundInput {
  roundId: string;
}

interface VerifyRoundData {
  roundId: string;
  serverSeed: string;
  serverSeedHash: string;
  crashPoint: number;
  crashedAt: Date;
}

type VerifyRoundOutput = Either<
  NotFoundException | BadRequestException,
  VerifyRoundData
>;

@Injectable()
export class VerifyRoundUseCase {
  constructor(private readonly roundRepository: RoundRepository) {}

  async execute(input: VerifyRoundInput): Promise<VerifyRoundOutput> {
    const round = await this.roundRepository.findById(
      new UniqueEntityId(input.roundId)
    );

    if (!round) {
      return left(new NotFoundException({ message: "Round not found" }));
    }

    if (!round.isCrashed) {
      return left(
        new BadRequestException({
          message:
            "Round has not crashed yet. Verification data is only available after crash."
        })
      );
    }

    const provablyFair = round.provablyFair;

    return right({
      roundId: round.id.toString(),
      serverSeed: provablyFair.serverSeed,
      serverSeedHash: provablyFair.serverSeedHash,
      crashPoint: provablyFair.crashPoint,
      crashedAt: round.crashedAt!
    });
  }
}
