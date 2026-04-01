import {
  GetCurrentRoundUseCase,
  GetRoundsHistoryUseCase,
  VerifyRoundUseCase
} from "@/application/use-cases/round";
import {
  BadRequestException,
  Controller,
  Get,
  InternalServerErrorException,
  NotFoundException,
  Param,
  Query
} from "@nestjs/common";
import {
  PaginatedResponseDto,
  PaginationQueryDto,
  RoundResponseDto,
  VerifyRoundResponseDto
} from "../dtos";

@Controller("rounds")
export class RoundsController {
  constructor(
    private readonly getRoundsHistory: GetRoundsHistoryUseCase,
    private readonly getCurrentRound: GetCurrentRoundUseCase,
    private readonly verifyRound: VerifyRoundUseCase
  ) {}

  @Get()
  async getHistory(
    @Query() query: PaginationQueryDto
  ): Promise<PaginatedResponseDto<RoundResponseDto>> {
    const result = await this.getRoundsHistory.execute({
      limit: query.limit,
      offset: query.offset
    });

    if (result.isLeft()) {
      throw new InternalServerErrorException(result.value.message);
    }

    const { data, total, limit, offset } = result.value;

    return {
      data: data.map(round => RoundResponseDto.fromDomain(round)),
      total,
      limit,
      offset
    };
  }

  @Get("current")
  async getCurrent(): Promise<RoundResponseDto> {
    const result = await this.getCurrentRound.execute();

    if (result.isLeft()) {
      throw new NotFoundException(result.value.message);
    }

    return RoundResponseDto.fromDomain(result.value, true);
  }

  @Get(":id/verify")
  async verify(@Param("id") id: string): Promise<VerifyRoundResponseDto> {
    const result = await this.verifyRound.execute({ roundId: id });

    if (result.isLeft()) {
      const error = result.value;

      if (error.name === "NotFoundException") {
        throw new NotFoundException(error.message);
      }

      throw new BadRequestException(error.message);
    }

    return result.value;
  }
}
