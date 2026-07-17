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
import { CreateRepoDto } from './dto/create-repo.dto';
import { ListReposQueryDto } from './dto/list-repos-query.dto';
import { ReorderRepoDto } from './dto/reorder-repo.dto';
import { UpdateRepoDto } from './dto/update-repo.dto';
import { ReposService } from './repos.service';

@ApiTags('repos')
@Controller('repos')
export class ReposController {
  constructor(private readonly reposService: ReposService) {}

  @Post()
  create(@Session() session: AuthSession, @Body() dto: CreateRepoDto) {
    return this.reposService.create(getSessionUserId(session), dto);
  }

  @Get()
  list(@Session() session: AuthSession, @Query() query: ListReposQueryDto) {
    return this.reposService.list(getSessionUserId(session), query);
  }

  @Get(':id')
  getById(@Session() session: AuthSession, @Param('id') id: string) {
    return this.reposService.getById(getSessionUserId(session), id);
  }

  @Patch(':id')
  update(
    @Session() session: AuthSession,
    @Param('id') id: string,
    @Body() dto: UpdateRepoDto,
  ) {
    return this.reposService.update(getSessionUserId(session), id, dto);
  }

  @Patch(':id/reorder')
  reorder(
    @Session() session: AuthSession,
    @Param('id') id: string,
    @Body() dto: ReorderRepoDto,
  ) {
    return this.reposService.reorder(getSessionUserId(session), id, dto.order);
  }

  @Delete(':id')
  softDelete(@Session() session: AuthSession, @Param('id') id: string) {
    return this.reposService.softDelete(getSessionUserId(session), id);
  }
}
