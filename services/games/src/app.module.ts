import { UseCasesModule } from "@/application/use-cases/use-cases.module";
import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AuthModule } from "./infrastructure/auth";
import { EnvModule } from "./infrastructure/env/env.module";
import { GameEngineModule } from "./infrastructure/game-engine/game-engine.module";
import { MessagingModule } from "./infrastructure/messaging";
import {
  BetController,
  BetsController,
  GamesController,
  RoundsController
} from "./presentation/controllers";
import { GameGateway } from "./presentation/gateways";

@Module({
  imports: [
    EnvModule,
    EventEmitterModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        name: "default",
        ttl: 60_000,
        limit: 60
      },
      {
        name: "bet",
        ttl: 60_000,
        limit: 5
      }
    ]),
    AuthModule,
    GameEngineModule,
    MessagingModule,
    UseCasesModule
  ],
  controllers: [
    GamesController,
    RoundsController,
    BetsController,
    BetController
  ],
  providers: [
    GameGateway,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard
    }
  ]
})
export class AppModule {}
