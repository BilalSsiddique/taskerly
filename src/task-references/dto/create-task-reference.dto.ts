import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskReferenceSourceType } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateTaskReferenceDto {
  @ApiProperty()
  @IsUUID()
  taskId: string;

  @ApiProperty({ enum: TaskReferenceSourceType })
  @IsEnum(TaskReferenceSourceType)
  sourceType: TaskReferenceSourceType;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  label: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(1000)
  url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}
