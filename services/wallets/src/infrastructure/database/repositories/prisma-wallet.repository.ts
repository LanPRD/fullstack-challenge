import { UniqueEntityId, Wallet, WalletRepository } from "@/domain";
import { Injectable } from "@nestjs/common";
import { PrismaWalletMapper } from "../mappers";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PrismaWalletRepository implements WalletRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: UniqueEntityId): Promise<Wallet | null> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { id: id.toString() }
    });

    if (!wallet) return null;

    return PrismaWalletMapper.toDomain(wallet);
  }

  async findByUserId(userId: UniqueEntityId): Promise<Wallet | null> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId: userId.toString() }
    });

    if (!wallet) return null;

    return PrismaWalletMapper.toDomain(wallet);
  }

  async save(wallet: Wallet): Promise<void> {
    const data = PrismaWalletMapper.toPrisma(wallet);

    await this.prisma.wallet.upsert({
      where: { id: data.id },
      create: data,
      update: {
        balance: data.balance,
        updatedAt: data.updatedAt
      }
    });
  }
}
