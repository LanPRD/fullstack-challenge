import { DatabaseModule } from "@/infrastructure/database/database.module";
import { MessagingModule } from "@/infrastructure/messaging";
import { Module } from "@nestjs/common";
import {
  CashoutUseCase,
  CrashRoundUseCase,
  CreateRoundUseCase,
  GetCurrentRoundUseCase,
  GetPlayerBetsHistoryUseCase,
  GetRoundsHistoryUseCase,
  PlaceBetUseCase,
  StartRoundUseCase,
  VerifyRoundUseCase
} from "./round";

const useCases = [
  CreateRoundUseCase,
  StartRoundUseCase,
  CrashRoundUseCase,
  PlaceBetUseCase,
  CashoutUseCase,
  GetCurrentRoundUseCase,
  GetRoundsHistoryUseCase,
  VerifyRoundUseCase,
  GetPlayerBetsHistoryUseCase
];

@Module({
  imports: [DatabaseModule, MessagingModule],
  providers: useCases,
  exports: useCases
})
export class UseCasesModule {}
