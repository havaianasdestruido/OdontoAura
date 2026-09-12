import { IsEmail, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'patient@example.com' })
  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase() : value))
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'securePass123' })
  @IsString()
  @MaxLength(72)
  password!: string;
}
