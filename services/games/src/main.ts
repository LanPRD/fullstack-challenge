import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true
    })
  );

  const config = new DocumentBuilder()
    .setTitle("Crash Game API")
    .setDescription(
      `
## Overview
REST API for the Crash Game service. This API provides endpoints for querying game history,
current round state, and provably fair verification.

## Game Mechanics
- **Rounds**: Each round has a random crash point determined before the round starts
- **Betting Phase**: Players can place bets before the round starts
- **Running Phase**: The multiplier increases until it crashes
- **Cashout**: Players can cash out at any time during the running phase to lock in their winnings

## Real-time Updates
For real-time game updates (multiplier ticks, new bets, cashouts), connect to the WebSocket gateway.

## Provably Fair
Each round uses a provably fair algorithm. The server seed hash is revealed before the round starts,
and the actual server seed is revealed after the crash, allowing players to verify the fairness.
    `
    )
    .setVersion("1.0")
    .addTag("Rounds", "Round history, current state, and verification")
    .addTag("Bets", "Player bet history")
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("docs", app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: "alpha",
      operationsSorter: "alpha"
    }
  });

  const port = process.env.PORT;
  await app.listen(port, "0.0.0.0");
  console.log(`Games service running on port ${port}`);
  console.log(`Swagger docs available at http://localhost:${port}/docs`);
}

bootstrap();
