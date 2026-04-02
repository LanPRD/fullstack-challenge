import { Module } from "@nestjs/common";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { EnvModule } from "../env/env.module";
import { EnvService } from "../env/env.service";
import { WalletClientService } from "./wallet-client.service";
import { WalletEventsController } from "./wallet-events.controller";

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: "WALLET_SERVICE",
        imports: [EnvModule],
        inject: [EnvService],
        useFactory: (envService: EnvService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [envService.get("RABBITMQ_URL")],
            queue: "wallet_commands",
            queueOptions: {
              durable: true
            }
          }
        })
      }
    ])
  ],
  controllers: [WalletEventsController],
  providers: [WalletClientService],
  exports: [WalletClientService]
})
export class MessagingModule {}
