import { EnvModule } from "@/infrastructure/env/env.module";
import { Module } from "@nestjs/common";
import { PrismaService } from "./prisma/prisma.service";

@Module({
  imports: [EnvModule],
  providers: [PrismaService],
  exports: [PrismaService]
})
export class DatabaseModule {}
