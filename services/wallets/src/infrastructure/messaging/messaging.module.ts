import { Module } from "@nestjs/common";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { EnvModule } from "../env/env.module";
import { EnvService } from "../env/env.service";
import { GameCommandsController } from "./game-commands.controller";
import { GamesEventService } from "./games-event.service";

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: "GAMES_SERVICE",
        imports: [EnvModule],
        inject: [EnvService],
        useFactory: (envService: EnvService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [envService.get("RABBITMQ_URL")],
            queue: "games_events",
            queueOptions: { durable: true }
          }
        })
      }
    ])
  ],
  providers: [GamesEventService],
  exports: [GamesEventService]
})
export class MessagingModule {}
