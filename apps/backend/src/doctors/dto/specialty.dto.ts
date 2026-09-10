import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSpecialtyDto {
  // TODO: add @Transform to trim name — casing/whitespace slips past findUnique guard
  @ApiProperty({ example: 'Ortodontia' })
  @IsString()
  @MaxLength(80)
  name!: string;

  @ApiPropertyOptional({ example: 'Tratamento de má oclusão e alinhamento dental' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}