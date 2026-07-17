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
import { CreateProjectDto } from './dto/create-project.dto';
import { ListProjectsQueryDto } from './dto/list-projects-query.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectsService } from './projects.service';

@ApiTags('projects')
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  create(@Session() session: AuthSession, @Body() dto: CreateProjectDto) {
    return this.projectsService.create(getSessionUserId(session), dto);
  }

  @Get()
  list(@Session() session: AuthSession, @Query() query: ListProjectsQueryDto) {
    return this.projectsService.list(getSessionUserId(session), query);
  }

  @Get(':id')
  getById(@Session() session: AuthSession, @Param('id') id: string) {
    return this.projectsService.getById(getSessionUserId(session), id);
  }

  @Patch(':id')
  update(
    @Session() session: AuthSession,
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projectsService.update(getSessionUserId(session), id, dto);
  }

  @Delete(':id')
  softDelete(@Session() session: AuthSession, @Param('id') id: string) {
    return this.projectsService.softDelete(getSessionUserId(session), id);
  }
}
