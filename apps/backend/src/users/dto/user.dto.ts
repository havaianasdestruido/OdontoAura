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
  phone?: string;

  @ApiProperty({ enum: Role })
  @IsEnum(Role)
  role!: Role;

  @ApiPropertyOptional({ example: 'securePass123' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(72)
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