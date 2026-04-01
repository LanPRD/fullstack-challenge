import { ApiProperty } from "@nestjs/swagger";

export class PaginatedResponseDto<T> {
  @ApiProperty({
    description: "Array of items for the current page",
    isArray: true
  })
  data: T[];

  @ApiProperty({
    description: "Total number of items available",
    example: 100
  })
  total: number;

  @ApiProperty({
    description: "Number of items per page",
    example: 20
  })
  limit: number;

  @ApiProperty({
    description: "Number of items skipped",
    example: 0
  })
  offset: number;
}
