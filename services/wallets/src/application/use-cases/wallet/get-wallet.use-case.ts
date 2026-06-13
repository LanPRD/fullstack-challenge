import { NotFoundException } from "@/application/errors";
import {
  UniqueEntityId,
  Wallet,
  WalletRepository,
  left,
  right,
  type Either
} from "@/domain";
import { Injectable } from "@nestjs/common";

interface GetWalletInput {
  userId: string;
}

type GetWalletOutput = Either<NotFoundException, Wallet>;

@Injectable()
export class GetWalletUseCase {
  constructor(private readonly walletRepository: WalletRepository) {}

  async execute({ userId }: GetWalletInput): Promise<GetWalletOutput> {
    const wallet = await this.walletRepository.findByUserId(
      new UniqueEntityId(userId)
    );

    if (!wallet) {
      return left(new NotFoundException({ message: "Wallet not found" }));
    }

    return right(wallet);
  }
}
