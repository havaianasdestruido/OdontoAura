import { IsEmail, IsString, IsOptional, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'patient@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'securePass123' })
  @IsString()
  @MinLength(6)
  @MaxLength(72)
  password!: string;

  @ApiProperty({ example: 'João Silva' })
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({ example: '+5511999990000' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;
}
