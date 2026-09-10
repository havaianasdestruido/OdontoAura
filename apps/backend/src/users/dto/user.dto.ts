import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class CreateUserDto {
  @ApiProperty({ example: 'employee@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Funcionário' })
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({ example: '+5511999990000' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  // TODO: add @Matches(/^\+?[1-9]\d{1,14}$/) to enforce E.164 phone format
  phone?: string;

  @ApiProperty({ enum: Role })
  @IsEnum(Role)
  role!: Role;

  @ApiPropertyOptional({ example: 'securePass123' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(72)
  // TODO: add password complexity regex (uppercase, digit, special char) via @Matches
  password?: string;
}

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Novo Nome' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ example: '+5511988887777' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;
}