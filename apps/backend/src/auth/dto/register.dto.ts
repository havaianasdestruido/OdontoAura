import { IsEmail, IsString, IsOptional, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'patient@example.com' })
  // TODO: add @Transform(({ value }) => value?.toLowerCase()) to normalize email before validation
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'securePass123' })
  @IsString()
  @MinLength(6)
  @MaxLength(72)
  // TODO: add @Matches(/^(?=.*[A-Z])(?=.*\d)/) to enforce at least one uppercase and one digit
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
