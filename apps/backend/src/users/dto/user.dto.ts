import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class CreateUserDto {
  @ApiProperty({ example: 'employee@example.com' })
  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase() : value))
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Funcionário' })
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({ example: '+5511999990000' })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, { message: 'phone must be in E.164 format like +5511999990000' })
  phone?: string;

  @ApiProperty({ enum: Role })
  @IsEnum(Role)
  role!: Role;

  @ApiPropertyOptional({ example: 'securePass123' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(72)
  @Matches(/^(?=.*[A-Z])(?=.*\d)/, {
    message: 'password must contain at least one uppercase letter and one digit',
  })
  password?: string;
}

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Novo Nome' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ example: 'novo@example.com' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase() : value))
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+5511988887777' })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, { message: 'phone must be in E.164 format like +5511988887777' })
  phone?: string;

  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}