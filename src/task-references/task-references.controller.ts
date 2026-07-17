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
import { CreateTaskReferenceDto } from './dto/create-task-reference.dto';
import { ListTaskReferencesQueryDto } from './dto/list-task-references-query.dto';
import { UpdateTaskReferenceDto } from './dto/update-task-reference.dto';
import { TaskReferencesService } from './task-references.service';

@ApiTags('task references')
@Controller('task-references')
export class TaskReferencesController {
  constructor(private readonly referencesService: TaskReferencesService) {}

  @Post()
  create(@Session() session: AuthSession, @Body() dto: CreateTaskReferenceDto) {
    return this.referencesService.create(getSessionUserId(session), dto);
  }

  @Get()
  listByTask(
    @Session() session: AuthSession,
    @Query() query: ListTaskReferencesQueryDto,
  ) {
    return this.referencesService.listByTask(
      getSessionUserId(session),
      query.taskId,
      query,
    );
  }

  @Get(':id')
  getById(@Session() session: AuthSession, @Param('id') id: string) {
    return this.referencesService.getById(getSessionUserId(session), id);
  }

  @Patch(':id')
  update(
    @Session() session: AuthSession,
    @Param('id') id: string,
    @Body() dto: UpdateTaskReferenceDto,
  ) {
    return this.referencesService.update(getSessionUserId(session), id, dto);
  }

  @Delete(':id')
  delete(@Session() session: AuthSession, @Param('id') id: string) {
    return this.referencesService.delete(getSessionUserId(session), id);
  }
}
