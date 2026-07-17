import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Session } from '@thallesp/nestjs-better-auth';
import { getSessionUserId } from '../common/auth/session-user';
import type { AuthSession } from '../common/auth/session-user';
import { CreateTaskDto } from './dto/create-task.dto';
import { ListNextTasksQueryDto } from './dto/list-next-tasks-query.dto';
import { ListTasksQueryDto } from './dto/list-tasks-query.dto';
import { ReorderTaskDto } from './dto/reorder-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TasksService } from './tasks.service';

@ApiTags('tasks')
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  create(@Session() session: AuthSession, @Body() dto: CreateTaskDto) {
    return this.tasksService.create(getSessionUserId(session), dto);
  }

  @Get()
  listByRepo(
    @Session() session: AuthSession,
    @Query() query: ListTasksQueryDto,
  ) {
    return this.tasksService.listByRepo(
      getSessionUserId(session),
      query.repoId,
      query,
    );
  }

  @Get('next')
  listNext(
    @Session() session: AuthSession,
    @Query() query: ListNextTasksQueryDto,
  ) {
    return this.tasksService.listNext(getSessionUserId(session), query);
  }

  @Get(':id/detail')
  getDetail(@Session() session: AuthSession, @Param('id') id: string) {
    return this.tasksService.getDetail(getSessionUserId(session), id);
  }

  @Get(':id')
  getById(@Session() session: AuthSession, @Param('id') id: string) {
    return this.tasksService.getById(getSessionUserId(session), id);
  }

  @Patch(':id')
  update(
    @Session() session: AuthSession,
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasksService.update(getSessionUserId(session), id, dto);
  }

  @Patch(':id/reorder')
  reorder(
    @Session() session: AuthSession,
    @Param('id') id: string,
    @Body() dto: ReorderTaskDto,
  ) {
    return this.tasksService.reorder(getSessionUserId(session), id, dto.order);
  }

  @Patch(':id/pin')
  pin(@Session() session: AuthSession, @Param('id') id: string) {
    return this.tasksService.setPinned(getSessionUserId(session), id, true);
  }

  @Patch(':id/unpin')
  unpin(@Session() session: AuthSession, @Param('id') id: string) {
    return this.tasksService.setPinned(getSessionUserId(session), id, false);
  }

  @Delete(':id')
  softDelete(@Session() session: AuthSession, @Param('id') id: string) {
    return this.tasksService.softDelete(getSessionUserId(session), id);
  }
}
