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
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse
} from "@nestjs/swagger";
import {
  BetResponseDto,
  PaginatedResponseDto,
  PaginationQueryDto
} from "../dtos";

@ApiTags("Bets")
@Controller("bets")
export class BetsController {
  constructor(
    private readonly getPlayerBetsHistory: GetPlayerBetsHistoryUseCase
  ) {}

  @Get("me")
  @ApiOperation({
    summary: "Get current user bet history",
    description:
      "Returns a paginated list of bets placed by the authenticated user, ordered by creation time descending. Requires user identification via x-user-id header (will be replaced by JWT authentication)."
  })
  @ApiHeader({
    name: "x-user-id",
    description: "User ID for authentication (temporary, will be replaced by JWT)",
    required: true,
    example: "123e4567-e89b-12d3-a456-426614174000"
  })
  @ApiOkResponse({
    description: "Paginated list of user bets",
    schema: {
      allOf: [
        { $ref: "#/components/schemas/PaginatedResponseDto" },
        {
          properties: {
            data: {
              type: "array",
              items: { $ref: "#/components/schemas/BetResponseDto" }
            }
          }
        }
      ],
      example: {
        data: [
          {
            id: "550e8400-e29b-41d4-a716-446655440000",
            oderId: "123e4567-e89b-12d3-a456-426614174000",
            roundId: "789e0123-e45b-67d8-a901-234567890000",
            status: "CASHED_OUT",
            amount: 10.5,
            cashoutMultiplier: 2.5,
            payout: 26.25,
            createdAt: "2024-01-15T10:30:05.000Z"
          },
          {
            id: "661f9511-f30c-52e5-b827-557766551111",
            oderId: "123e4567-e89b-12d3-a456-426614174000",
            roundId: "890f1234-f56c-78e9-b012-345678901111",
            status: "LOST",
            amount: 5.0,
            cashoutMultiplier: null,
            payout: null,
            createdAt: "2024-01-15T10:25:00.000Z"
          }
        ],
        total: 50,
        limit: 20,
        offset: 0
      }
    }
  })
  @ApiUnauthorizedResponse({
    description: "User ID header is missing",
    schema: {
      example: {
        statusCode: 401,
        message: "User ID is required"
      }
    }
  })
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
