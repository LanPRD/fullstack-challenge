import { UseCasesModule } from "@/application/use-cases/use-cases.module";
import { Module } from "@nestjs/common";
import { GameEngineService } from "./game-engine.service";

@Module({
  imports: [UseCasesModule],
  providers: [GameEngineService],
  exports: [GameEngineService]
})
export class GameEngineModule {}
