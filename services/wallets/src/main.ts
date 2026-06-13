import "reflect-metadata";

import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { MicroserviceOptions, Transport } from "@nestjs/microservices";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { EnvService } from "./infrastructure/env/env.service";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: ["http://localhost:3000", "http://localhost:5173"],
    credentials: true
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true
    })
  );

  const config = new DocumentBuilder()
    .setTitle("Wallet Service API")
    .setDescription("REST API for the Wallet service. Manages player balances.")
    .setVersion("1.0")
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Enter your Keycloak JWT token"
      },
      "bearer"
    )
    .addTag("Wallets", "Wallet creation and balance queries")
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("docs", app, document, {
    swaggerOptions: { persistAuthorization: true }
  });

  const envService = app.get(EnvService);
  const port = envService.get("PORT");
  const rabbitmqUrl = envService.get("RABBITMQ_URL");

  // Listen on wallet_commands queue for debit/credit commands from games service
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [rabbitmqUrl],
      queue: "wallet_commands",
      queueOptions: { durable: true }
    }
  });

  await app.startAllMicroservices();
  await app.listen(port, "0.0.0.0");

  console.log(`Wallets service running on port ${port}`);
  console.log(
    `Wallets microservice listening on RabbitMQ queue: wallet_commands`
  );
  console.log(`Swagger docs available at http://localhost:${port}/docs`);
}

bootstrap();
