import {
  IsBoolean,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateHealthPlanDto {
  @ApiProperty({ example: 'Plano Ouro' })
  @IsString()
  @MaxLength(80)
  name!: string;

  @ApiProperty({ example: 'OdontoPrev' })
  @IsString()
  @MaxLength(80)
  provider!: string;

  @ApiProperty({ example: 80, minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  coveragePercentage!: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateHealthPlanDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  provider?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  coveragePercentage?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AssignPlanDto {
  @ApiProperty()
  @IsUUID()
  patientId!: string;

  @ApiProperty()
  @IsUUID()
  healthPlanId!: string;

  @ApiProperty({ example: 'OURO-12345' })
  @IsString()
  @Matches(/^[A-Za-z0-9][A-Za-z0-9-]{0,59}$/, {
    message: 'cardNumber must be alphanumeric, optionally containing dashes',
  })
  cardNumber!: string;

  @ApiProperty({ example: '2027-12-31T00:00:00.000Z' })
  @IsISO8601()
  expiryDate!: string;
}