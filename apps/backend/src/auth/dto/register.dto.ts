import { IsEmail, IsString, IsOptional, MinLength, MaxLength, Matches } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'patient@example.com' })
  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase() : value))
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'securePass123' })
  @IsString()
  @MinLength(6)
  @MaxLength(72)
  @Matches(/^(?=.*[A-Z])(?=.*\d)/, {
    message: 'password must contain at least one uppercase letter and one digit',
  })
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