import { UseCasesModule } from "@/application/use-cases/use-cases.module";
import { Module } from "@nestjs/common";
import { AuthModule } from "./infrastructure/auth/auth.module";
import { EnvModule } from "./infrastructure/env/env.module";
import { MessagingModule } from "./infrastructure/messaging/messaging.module";
import { GameCommandsController } from "./infrastructure/messaging/game-commands.controller";
import { WalletsController } from "./presentation/controllers/wallets.controller";

@Module({
  imports: [EnvModule, AuthModule, MessagingModule, UseCasesModule],
  controllers: [WalletsController, GameCommandsController]
})
export class AppModule {}
