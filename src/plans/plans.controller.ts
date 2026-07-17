import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Session } from '@thallesp/nestjs-better-auth';
import { getSessionUserId } from '../common/auth/session-user';
import type { AuthSession } from '../common/auth/session-user';
import { CreatePlanDto } from './dto/create-plan.dto';
import { CreatePlanVersionDto } from './dto/create-plan-version.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { PlansService } from './plans.service';

@ApiTags('plans')
@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Post()
  create(@Session() session: AuthSession, @Body() dto: CreatePlanDto) {
    return this.plansService.create(getSessionUserId(session), dto);
  }

  @Get()
  listByTask(@Session() session: AuthSession, @Query('taskId') taskId: string) {
    return this.plansService.listByTask(getSessionUserId(session), taskId);
  }

  @Get(':id')
  getById(@Session() session: AuthSession, @Param('id') id: string) {
    return this.plansService.getById(getSessionUserId(session), id);
  }

  @Patch(':id')
  updateMetadata(
    @Session() session: AuthSession,
    @Param('id') id: string,
    @Body() dto: UpdatePlanDto,
  ) {
    return this.plansService.updateMetadata(getSessionUserId(session), id, dto);
  }

  @Post(':id/versions')
  createVersion(
    @Session() session: AuthSession,
    @Param('id') id: string,
    @Body() dto: CreatePlanVersionDto,
  ) {
    return this.plansService.createVersion(getSessionUserId(session), id, dto);
  }

  @Get(':id/versions/:versionNumber')
  getVersion(
    @Session() session: AuthSession,
    @Param('id') id: string,
    @Param('versionNumber', ParseIntPipe) versionNumber: number,
  ) {
    return this.plansService.getVersion(
      getSessionUserId(session),
      id,
      versionNumber,
    );
  }

  @Delete(':id')
  softDelete(@Session() session: AuthSession, @Param('id') id: string) {
    return this.plansService.softDelete(getSessionUserId(session), id);
  }
}
