import { RepositoriesModule } from "@/infrastructure/database";
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
  imports: [RepositoriesModule],
  providers: useCases,
  exports: useCases
})
export class UseCasesModule {}
