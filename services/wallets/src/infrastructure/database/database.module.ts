import { WalletRepository } from "@/domain";
import { EnvModule } from "@/infrastructure/env/env.module";
import { Module } from "@nestjs/common";
import { PrismaService } from "./prisma/prisma.service";
import { PrismaWalletRepository } from "./repositories/prisma-wallet.repository";

@Module({
  imports: [EnvModule],
  providers: [
    PrismaService,
    {
      provide: WalletRepository,
      useClass: PrismaWalletRepository
    }
  ],
  exports: [PrismaService, WalletRepository]
})
export class DatabaseModule {}
