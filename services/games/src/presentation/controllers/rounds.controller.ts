import {
  GetCurrentRoundUseCase,
  GetRoundsHistoryUseCase,
  VerifyRoundUseCase
} from "@/application/use-cases/round";
import { Public } from "@/infrastructure/auth";
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
  ApiExtraModels,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  getSchemaPath
} from "@nestjs/swagger";
import {
  PaginatedResponseDto,
  PaginationQueryDto,
  RoundResponseDto,
  VerifyRoundResponseDto
} from "../dtos";

@Public()
@ApiTags("Rounds")
@ApiExtraModels(PaginatedResponseDto, RoundResponseDto)
@Controller("rounds")
export class RoundsController {
  constructor(
    private readonly getRoundsHistory: GetRoundsHistoryUseCase,
    private readonly getCurrentRound: GetCurrentRoundUseCase,
    private readonly verifyRound: VerifyRoundUseCase
  ) {}

  @Get("history")
  @ApiOperation({
    summary: "Get rounds history",
    description:
      "Returns a paginated list of completed (crashed) rounds, ordered by crash time descending. Use this endpoint to display the game history to players."
  })
  @ApiOkResponse({
    description: "Paginated list of rounds",
    schema: {
      allOf: [
        { $ref: getSchemaPath(PaginatedResponseDto) },
        {
          properties: {
            data: {
              type: "array",
              items: { $ref: getSchemaPath(RoundResponseDto) }
            }
          }
        }
      ],
      example: {
        data: [
          {
            id: "550e8400-e29b-41d4-a716-446655440000",
            status: "CRASHED",
            serverSeedHash: "a1b2c3d4e5f6...",
            crashPoint: 2.47,
            startedAt: "2024-01-15T10:30:00.000Z",
            crashedAt: "2024-01-15T10:30:15.000Z",
            createdAt: "2024-01-15T10:29:45.000Z"
          }
        ],
        total: 100,
        limit: 20,
        offset: 0
      }
    }
  })
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
  @ApiOperation({
    summary: "Get current active round",
    description:
      "Returns the current active round (either in BETTING or RUNNING status) with all placed bets. Use this endpoint to get the game state when a player connects."
  })
  @ApiOkResponse({
    description: "Current active round with bets",
    type: RoundResponseDto,
    example: {
      id: "550e8400-e29b-41d4-a716-446655440000",
      status: "BETTING",
      serverSeedHash: "a1b2c3d4e5f6...",
      crashPoint: null,
      startedAt: "2024-01-15T10:30:00.000Z",
      crashedAt: null,
      createdAt: "2024-01-15T10:29:45.000Z",
      bets: [
        {
          id: "123e4567-e89b-12d3-a456-426614174000",
          userId: "user-123",
          roundId: "550e8400-e29b-41d4-a716-446655440000",
          status: "PENDING",
          amount: 10.5,
          cashoutMultiplier: null,
          payout: null,
          createdAt: "2024-01-15T10:30:05.000Z"
        }
      ]
    }
  })
  @ApiNotFoundResponse({
    description: "No active round found",
    schema: {
      example: {
        statusCode: 404,
        message: "No active round found"
      }
    }
  })
  async getCurrent(): Promise<RoundResponseDto> {
    const result = await this.getCurrentRound.execute();

    if (result.isLeft()) {
      throw new NotFoundException(result.value.message);
    }

    return RoundResponseDto.fromDomain(result.value, true);
  }

  @Get(":id/verify")
  @ApiOperation({
    summary: "Verify round fairness",
    description:
      "Returns the provably fair verification data for a crashed round. Players can use this data to verify that the crash point was determined fairly before the round started. The server seed is only revealed after the round crashes."
  })
  @ApiParam({
    name: "id",
    description: "Round UUID to verify",
    example: "550e8400-e29b-41d4-a716-446655440000"
  })
  @ApiOkResponse({
    description: "Provably fair verification data",
    type: VerifyRoundResponseDto,
    example: {
      roundId: "550e8400-e29b-41d4-a716-446655440000",
      serverSeed: "secret-server-seed-value-12345",
      serverSeedHash: "a1b2c3d4e5f6...",
      crashPoint: 2.47,
      crashedAt: "2024-01-15T10:30:15.000Z"
    }
  })
  @ApiNotFoundResponse({
    description: "Round not found",
    schema: {
      example: {
        statusCode: 404,
        message: "Round not found"
      }
    }
  })
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
