import { DatabaseModule } from "@/infrastructure/database/database.module";
import { MessagingModule } from "@/infrastructure/messaging/messaging.module";
import { Module } from "@nestjs/common";
import {
  CancelBetUseCase,
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
  CancelBetUseCase,
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
