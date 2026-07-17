import { ApiPropertyOptional } from '@nestjs/swagger';
import { DocType } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class UpdateDocDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string;

  @ApiPropertyOptional({ enum: DocType })
  @IsOptional()
  @IsEnum(DocType)
  docType?: DocType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  taskId?: string | null;
}
