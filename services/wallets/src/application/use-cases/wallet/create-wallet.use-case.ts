import { ConflictException, InternalException } from "@/application/errors";
import { Money, UniqueEntityId, Wallet, WalletRepository, left, right, type Either } from "@/domain";
import { Injectable, Logger } from "@nestjs/common";

interface CreateWalletInput {
  userId: string;
  initialBalanceCents?: number;
}

type CreateWalletOutput = Either<ConflictException | InternalException, Wallet>;

@Injectable()
export class CreateWalletUseCase {
  private readonly _logger = new Logger(CreateWalletUseCase.name);

  constructor(private readonly walletRepository: WalletRepository) {}

  async execute({ userId, initialBalanceCents = 0 }: CreateWalletInput): Promise<CreateWalletOutput> {
    const existing = await this.walletRepository.findByUserId(new UniqueEntityId(userId));

    if (existing) {
      return left(new ConflictException({ message: "Wallet already exists for this user" }));
    }

    const balanceResult = Money.fromCents(BigInt(initialBalanceCents));

    if (balanceResult.isLeft()) {
      return left(new InternalException({ message: "Invalid initial balance" }));
    }

    const wallet = Wallet.create({
      userId: new UniqueEntityId(userId),
      balance: balanceResult.value
    });

    try {
      await this.walletRepository.save(wallet);
      return right(wallet);
    } catch (error) {
      this._logger.error(`Error creating wallet: ${error}`);
      return left(new InternalException({ message: "Error creating wallet" }));
    }
  }
}
