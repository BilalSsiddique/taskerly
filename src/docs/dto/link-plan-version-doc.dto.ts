import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PlanDocRole } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export class LinkPlanVersionDocDto {
  @ApiProperty()
  @IsUUID()
  planVersionId: string;

  @ApiProperty()
  @IsUUID()
  docId: string;

  @ApiProperty({ enum: PlanDocRole })
  @IsEnum(PlanDocRole)
  role: PlanDocRole;

  @ApiPropertyOptional({
    description: 'Defaults to the latest DocVersion at link time.',
  })
  @IsOptional()
  @IsUUID()
  docVersionId?: string;
}
