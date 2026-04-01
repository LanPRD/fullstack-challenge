import { GetPlayerBetsHistoryUseCase } from "@/application/use-cases/round";
import {
  Controller,
  Get,
  Headers,
  InternalServerErrorException,
  Query,
  UnauthorizedException
} from "@nestjs/common";
import {
  BetResponseDto,
  PaginatedResponseDto,
  PaginationQueryDto
} from "../dtos";

@Controller("bets")
export class BetsController {
  constructor(
    private readonly getPlayerBetsHistory: GetPlayerBetsHistoryUseCase
  ) {}

  @Get("me")
  async getMyBets(
    @Query() query: PaginationQueryDto,
    @Headers("x-user-id") userId?: string
  ): Promise<PaginatedResponseDto<BetResponseDto>> {
    if (!userId) {
      throw new UnauthorizedException("User ID is required");
    }

    const result = await this.getPlayerBetsHistory.execute({
      userId,
      limit: query.limit,
      offset: query.offset
    });

    if (result.isLeft()) {
      throw new InternalServerErrorException(result.value.message);
    }

    const { data, total, limit, offset } = result.value;

    return {
      data: data.map(BetResponseDto.fromDomain),
      total,
      limit,
      offset
    };
  }
}
