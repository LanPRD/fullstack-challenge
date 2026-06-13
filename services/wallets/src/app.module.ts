import { UseCasesModule } from "@/application/use-cases/use-cases.module";
import { Module } from "@nestjs/common";
import { AuthModule } from "./infrastructure/auth/auth.module";
import { EnvModule } from "./infrastructure/env/env.module";
import { MessagingModule } from "./infrastructure/messaging/messaging.module";
import { WalletsController } from "./presentation/controllers/wallets.controller";

@Module({
  imports: [EnvModule, AuthModule, MessagingModule, UseCasesModule],
  controllers: [WalletsController]
})
export class AppModule {}
