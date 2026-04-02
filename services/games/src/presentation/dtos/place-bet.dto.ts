import { ApiProperty } from "@nestjs/swagger";
import { IsInt, Max, Min } from "class-validator";

export class PlaceBetDto {
  @ApiProperty({
    description: "Bet amount in cents (100 = $1.00)",
    minimum: 100,
    maximum: 100000,
    example: 1000
  })
  @IsInt()
  @Min(100, { message: "Minimum bet is 100 cents ($1.00)" })
  @Max(100000, { message: "Maximum bet is 100000 cents ($1000.00)" })
  amount: number;
}
