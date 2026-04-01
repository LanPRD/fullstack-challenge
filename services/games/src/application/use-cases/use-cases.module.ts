import { DatabaseModule } from "@/infrastructure/database/database.module";
import { Module } from "@nestjs/common";
import {
  CashoutUseCase,
  CrashRoundUseCase,
  CreateRoundUseCase,
  PlaceBetUseCase,
  StartRoundUseCase
} from "./round";

const useCases = [
  CreateRoundUseCase,
  StartRoundUseCase,
  CrashRoundUseCase,
  PlaceBetUseCase,
  CashoutUseCase
];

@Module({
  imports: [DatabaseModule],
  providers: useCases,
  exports: useCases
})
export class UseCasesModule {}
