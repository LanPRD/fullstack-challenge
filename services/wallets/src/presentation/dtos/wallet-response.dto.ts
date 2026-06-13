import type { Wallet } from "@/domain";
import { ApiProperty } from "@nestjs/swagger";

export class WalletResponseDto {
  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  id: string;

  @ApiProperty({ example: "28ea6d92-461c-4a27-bc42-d7d81b3348f6" })
  userId: string;

  @ApiProperty({
    example: 1000.0,
    description: "Balance in currency units (not cents)"
  })
  balance: number;

  @ApiProperty({ example: "2024-01-15T10:30:00.000Z" })
  createdAt: string;

  @ApiProperty({ example: "2024-01-15T10:30:00.000Z" })
  updatedAt: string;

  static fromDomain(wallet: Wallet): WalletResponseDto {
    const dto = new WalletResponseDto();
    dto.id = wallet.id.toString();
    dto.userId = wallet.userId.toString();
    dto.balance = Number(wallet.balance.toCents()) / 100;
    dto.createdAt = wallet.createdAt.toISOString();
    dto.updatedAt = wallet.updatedAt.toISOString();
    return dto;
  }
}
