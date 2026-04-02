import { CashoutUseCase, PlaceBetUseCase } from "@/application/use-cases/round";
import { CurrentUser, type AuthUser } from "@/infrastructure/auth";
import { GameEngineService } from "@/infrastructure/game-engine/game-engine.service";
import {
  BadRequestException,
  Body,
  Controller,
  NotFoundException,
  Post
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse
} from "@nestjs/swagger";
import { BetResponseDto, PlaceBetDto } from "../dtos";

@ApiBearerAuth()
@ApiTags("Bet")
@Controller("bet")
export class BetController {
  constructor(
    private readonly placeBetUseCase: PlaceBetUseCase,
    private readonly cashoutUseCase: CashoutUseCase,
    private readonly gameEngine: GameEngineService
  ) {}

  @Post()
  @ApiOperation({
    summary: "Place a bet",
    description:
      "Place a bet on the current round. Only allowed during the betting phase. Each player can only place one bet per round."
  })
  @ApiCreatedResponse({
    description: "Bet placed successfully",
    type: BetResponseDto,
    example: {
      id: "550e8400-e29b-41d4-a716-446655440000",
      oderId: "28ea6d92-461c-4a27-bc42-d7d81b3348f6",
      roundId: "789e0123-e45b-67d8-a901-234567890000",
      status: "PENDING",
      amount: 10.0,
      cashoutMultiplier: null,
      payout: null,
      createdAt: "2024-01-15T10:30:05.000Z"
    }
  })
  @ApiBadRequestResponse({
    description:
      "Invalid bet (not in betting phase, already bet, invalid amount)",
    schema: {
      example: {
        statusCode: 400,
        message: "Betting phase has ended"
      }
    }
  })
  @ApiUnauthorizedResponse({
    description: "Invalid or missing JWT token"
  })
  async placeBet(
    @Body() dto: PlaceBetDto,
    @CurrentUser() user: AuthUser
  ): Promise<BetResponseDto> {
    const result = await this.placeBetUseCase.execute({
      userId: user.id,
      amount: dto.amount
    });

    if (result.isLeft()) {
      const error = result.value;

      if (error.name === "NotFoundException") {
        throw new NotFoundException(error.message);
      }

      throw new BadRequestException(error.message);
    }

    return BetResponseDto.fromDomain(result.value);
  }

  @Post("cashout")
  @ApiOperation({
    summary: "Cash out current bet",
    description:
      "Cash out your bet at the current multiplier. Only allowed during the running phase with a pending bet."
  })
  @ApiCreatedResponse({
    description: "Cashout successful",
    type: BetResponseDto,
    example: {
      id: "550e8400-e29b-41d4-a716-446655440000",
      oderId: "28ea6d92-461c-4a27-bc42-d7d81b3348f6",
      roundId: "789e0123-e45b-67d8-a901-234567890000",
      status: "CASHED_OUT",
      amount: 10.0,
      cashoutMultiplier: 2.5,
      payout: 25.0,
      createdAt: "2024-01-15T10:30:05.000Z"
    }
  })
  @ApiBadRequestResponse({
    description: "Invalid cashout (not running, no bet, already cashed out)",
    schema: {
      example: {
        statusCode: 400,
        message: "Round is not running"
      }
    }
  })
  @ApiNotFoundResponse({
    description: "No active bet found",
    schema: {
      example: {
        statusCode: 404,
        message: "Bet not found"
      }
    }
  })
  @ApiUnauthorizedResponse({
    description: "Invalid or missing JWT token"
  })
  async cashout(@CurrentUser() user: AuthUser): Promise<BetResponseDto> {
    const userBet = this.gameEngine.currentRound?.bets?.find(
      bet => bet.userId.toString() === user.id
    );

    if (!userBet) {
      throw new NotFoundException("No active bet found");
    }

    const multiplier = this.gameEngine.getMultiplierForCashout();

    if (multiplier === null) {
      throw new BadRequestException("Round is not running");
    }

    const result = await this.cashoutUseCase.execute({
      betId: userBet.id.toString(),
      multiplier
    });

    if (result.isLeft()) {
      const error = result.value;

      if (error.name === "NotFoundException") {
        throw new NotFoundException(error.message);
      }

      throw new BadRequestException(error.message);
    }

    return BetResponseDto.fromDomain(result.value);
  }
}
