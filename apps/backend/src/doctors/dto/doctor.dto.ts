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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDoctorDto {
  @ApiProperty()
  @IsUUID()
  userId!: string;

  @ApiProperty({ example: 'CRM-123456' })
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

export class CreateAvailabilityDto {
  @ApiProperty({ example: 1, description: '0=Sunday .. 6=Saturday' })
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @ApiProperty({ example: '08:00' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'startTime must be HH:MM' })
  startTime!: string;

  @ApiProperty({ example: '12:00' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'endTime must be HH:MM' })
  endTime!: string;
}

export class AvailabilitySlotDto {
  id!: string;
  dayOfWeek!: number;
  startTime!: string;
  endTime!: string;
}