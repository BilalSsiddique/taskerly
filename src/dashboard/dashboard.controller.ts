import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Session } from '@thallesp/nestjs-better-auth';
import { getSessionUserId } from '../common/auth/session-user';
import type { AuthSession } from '../common/auth/session-user';
import { TasksService } from '../tasks/tasks.service';

@ApiTags('dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly tasksService: TasksService) {}

  @Get('summary')
  getSummary(@Session() session: AuthSession) {
    return this.tasksService.getDashboardSummary(getSessionUserId(session));
  }
}
