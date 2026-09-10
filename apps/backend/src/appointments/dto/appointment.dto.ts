import {
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAppointmentDto {
  @ApiProperty()
  @IsUUID()
  patientId!: string;

  @ApiProperty()
  @IsUUID()
  doctorId!: string;

  @ApiProperty()
  @IsUUID()
  specialtyId!: string;

  @ApiProperty({ example: '2026-09-10T14:00:00.000Z' })
  @IsISO8601()
  scheduledAt!: string;

  @ApiPropertyOptional({ example: 30, minimum: 5, maximum: 480, default: 30 })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(480)
  durationMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class UpdateAppointmentDto {
  @ApiPropertyOptional({ example: 'Remarcada para a tarde' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({ example: '2026-09-12T09:00:00.000Z' })
  @IsOptional()
  @IsISO8601()
  scheduledAt?: string;
}