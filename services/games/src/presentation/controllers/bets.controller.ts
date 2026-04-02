import { GetPlayerBetsHistoryUseCase } from "@/application/use-cases/round";
import { CurrentUser, type AuthUser } from "@/infrastructure/auth";
import {
  Controller,
  Get,
  InternalServerErrorException,
  Query
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  getSchemaPath
} from "@nestjs/swagger";
import {
  BetResponseDto,
  PaginatedResponseDto,
  PaginationQueryDto
} from "../dtos";

@ApiBearerAuth()
@ApiTags("Bets")
@ApiExtraModels(PaginatedResponseDto, BetResponseDto)
@Controller("bets")
export class BetsController {
  constructor(
    private readonly getPlayerBetsHistory: GetPlayerBetsHistoryUseCase
  ) {}

  @Get("me")
  @ApiOperation({
    summary: "Get current user bet history",
    description:
      "Returns a paginated list of bets placed by the authenticated user, ordered by creation time descending. Requires JWT authentication."
  })
  @ApiOkResponse({
    description: "Paginated list of user bets",
    schema: {
      allOf: [
        { $ref: getSchemaPath(PaginatedResponseDto) },
        {
          properties: {
            data: {
              type: "array",
              items: { $ref: getSchemaPath(BetResponseDto) }
            }
          }
        }
      ],
      example: {
        data: [
          {
            id: "550e8400-e29b-41d4-a716-446655440000",
            userId: "123e4567-e89b-12d3-a456-426614174000",
            roundId: "789e0123-e45b-67d8-a901-234567890000",
            status: "CASHED_OUT",
            amount: 10.5,
            cashoutMultiplier: 2.5,
            payout: 26.25,
            createdAt: "2024-01-15T10:30:05.000Z"
          }
        ],
        total: 50,
        limit: 20,
        offset: 0
      }
    }
  })
  @ApiUnauthorizedResponse({
    description: "Invalid or missing JWT token",
    schema: {
      example: {
        statusCode: 401,
        message: "Unauthorized"
      }
    }
  })
  async getMyBets(
    @Query() query: PaginationQueryDto,
    @CurrentUser() user: AuthUser
  ): Promise<PaginatedResponseDto<BetResponseDto>> {
    const result = await this.getPlayerBetsHistory.execute({
      userId: user.id,
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
