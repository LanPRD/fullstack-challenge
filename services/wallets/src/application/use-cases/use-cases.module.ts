import { DatabaseModule } from "@/infrastructure/database/database.module";
import { MessagingModule } from "@/infrastructure/messaging";
import { Module } from "@nestjs/common";
import {
  CreateWalletUseCase,
  CreditWalletUseCase,
  DebitWalletUseCase,
  GetWalletUseCase
} from "./wallet";

const useCases = [
  CreateWalletUseCase,
  GetWalletUseCase,
  DebitWalletUseCase,
  CreditWalletUseCase
];

@Module({
  imports: [DatabaseModule, MessagingModule],
  providers: useCases,
  exports: useCases
})
export class UseCasesModule {}
