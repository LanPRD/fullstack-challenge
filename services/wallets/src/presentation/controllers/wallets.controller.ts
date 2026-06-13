import { ConflictException } from "@/application/errors";
import {
  CreateWalletUseCase,
  GetWalletUseCase
} from "@/application/use-cases/wallet";
import { CurrentUser, Public, type AuthUser } from "@/infrastructure/auth";
import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException as NestNotFoundException,
  Post
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse
} from "@nestjs/swagger";
import { WalletResponseDto } from "../dtos";

@ApiBearerAuth()
@ApiTags("Wallets")
@Controller("wallets")
export class WalletsController {
  constructor(
    private readonly createWalletUseCase: CreateWalletUseCase,
    private readonly getWalletUseCase: GetWalletUseCase
  ) {}

  @Get("health")
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Health check" })
  health() {
    return { status: "ok", service: "wallets" };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Create wallet",
    description:
      "Creates a wallet for the authenticated player. Each player can only have one wallet."
  })
  @ApiCreatedResponse({
    type: WalletResponseDto,
    description: "Wallet created"
  })
  @ApiConflictResponse({ description: "Wallet already exists" })
  @ApiUnauthorizedResponse({ description: "Invalid or missing JWT token" })
  async create(@CurrentUser() user: AuthUser): Promise<WalletResponseDto> {
    const result = await this.createWalletUseCase.execute({ userId: user.id });

    if (result.isLeft()) {
      throw new ConflictException({ message: result.value.message });
    }

    return WalletResponseDto.fromDomain(result.value);
  }

  @Get("me")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Get my wallet",
    description:
      "Returns the authenticated player's wallet and current balance."
  })
  @ApiOkResponse({ type: WalletResponseDto, description: "Wallet details" })
  @ApiNotFoundResponse({ description: "Wallet not found" })
  @ApiUnauthorizedResponse({ description: "Invalid or missing JWT token" })
  async getMe(@CurrentUser() user: AuthUser): Promise<WalletResponseDto> {
    const result = await this.getWalletUseCase.execute({ userId: user.id });

    if (result.isLeft()) {
      throw new NestNotFoundException(result.value.message);
    }

    return WalletResponseDto.fromDomain(result.value);
  }
}
