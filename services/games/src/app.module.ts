import { Module } from "@nestjs/common";
import { EnvModule } from "./infrastructure/env/env.module";
import { GamesController } from "./presentation/controllers/games.controller";

@Module({
  imports: [EnvModule],
  providers: [],
  controllers: [GamesController]
})
export class AppModule {}
