import { IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSpecialtyDto {
  @ApiProperty({ example: 'Ortodontia' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(80)
  name!: string;

  @ApiPropertyOptional({ example: 'Tratamento de má oclusão e alinhamento dental' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class UpdateSpecialtyDto {
  @ApiPropertyOptional({ example: 'Implantodontia' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(80)
  name?: string;

  @ApiPropertyOptional({ example: 'Implantes dentários' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}