import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PlanStatus } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreatePlanDto {
  @ApiProperty()
  @IsUUID()
  taskId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  title: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  changeSummary?: string;

  @ApiPropertyOptional({
    enum: [PlanStatus.SUPERSEDED, PlanStatus.ABANDONED],
    description:
      'Required when creating a new active plan while the task already has one.',
  })
  @IsOptional()
  @IsEnum(PlanStatus)
  previousPlanStatus?: PlanStatus;
}
