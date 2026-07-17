import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PriorityLevel, TaskStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateTaskDto {
  @ApiProperty()
  @IsUUID()
  repoId: string;

  @ApiProperty({ example: 'Migrate /pay to PaymentIntent' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: TaskStatus, default: TaskStatus.BACKLOG })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({ enum: PriorityLevel, default: PriorityLevel.MEDIUM })
  @IsOptional()
  @IsEnum(PriorityLevel)
  priority?: PriorityLevel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lastContext?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  dueAt?: Date;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
