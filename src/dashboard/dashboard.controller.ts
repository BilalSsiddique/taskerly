import { Controller, Get, Query } from '@nestjs/common';
import { ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { ProjectCategory } from '@prisma/client';
import { Session } from '@thallesp/nestjs-better-auth';
import { IsEnum, IsOptional } from 'class-validator';
import { getSessionUserId } from '../common/auth/session-user';
import type { AuthSession } from '../common/auth/session-user';
import { TasksService } from '../tasks/tasks.service';

class DashboardSummaryQueryDto {
  @ApiPropertyOptional({ enum: ProjectCategory })
  @IsOptional()
  @IsEnum(ProjectCategory)
  projectCategory?: ProjectCategory;
}

@ApiTags('dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly tasksService: TasksService) {}

  @Get('summary')
  getSummary(
    @Session() session: AuthSession,
    @Query() query: DashboardSummaryQueryDto,
  ) {
    return this.tasksService.getDashboardSummary(
      getSessionUserId(session),
      query.projectCategory,
    );
  }
}
