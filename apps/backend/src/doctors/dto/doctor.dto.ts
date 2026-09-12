import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDoctorDto {
  @ApiProperty()
  @IsUUID()
  userId!: string;

  @ApiProperty({ example: 'CRM-123456' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @MaxLength(30)
  licenseNumber!: string;

  @ApiProperty()
  @IsUUID()
  specialtyId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;
}

export class UpdateDoctorDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  specialtyId?: string;
}

const SLOT_TIME_PATTERN = /^([01]\d|2[0-3]):(00|05|10|15|20|25|30|35|40|45|50|55)$/;

export class CreateAvailabilityDto {
  @ApiProperty({ example: 1, description: '0=Sunday .. 6=Saturday' })
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @ApiProperty({ example: '08:00' })
  @IsString()
  @Matches(SLOT_TIME_PATTERN, { message: 'startTime must be HH:MM on a 5-minute grid' })
  startTime!: string;

  @ApiProperty({ example: '12:00' })
  @IsString()
  @Matches(SLOT_TIME_PATTERN, { message: 'endTime must be HH:MM on a 5-minute grid' })
  endTime!: string;
}

export class AvailabilitySlotDto {
  id!: string;
  dayOfWeek!: number;
  startTime!: string;
  endTime!: string;
}