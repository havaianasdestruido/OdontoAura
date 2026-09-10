import { IsEmail, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'patient@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'securePass123' })
  @IsString()
  // TODO: add @MaxLength(72) to match register DTO and reject oversized payloads early
  password!: string;
}
