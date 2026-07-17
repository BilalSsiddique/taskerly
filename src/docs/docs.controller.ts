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
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import { CreateDocDto } from './dto/create-doc.dto';
import { CreateDocVersionDto } from './dto/create-doc-version.dto';
import { LinkPlanVersionDocDto } from './dto/link-plan-version-doc.dto';
import { UpdateDocDto } from './dto/update-doc.dto';
import { DocsService } from './docs.service';

@ApiTags('docs')
@Controller('docs')
export class DocsController {
  constructor(private readonly docsService: DocsService) {}

  @Post()
  create(@Session() session: AuthSession, @Body() dto: CreateDocDto) {
    return this.docsService.create(getSessionUserId(session), dto);
  }

  @Get()
  list(@Session() session: AuthSession, @Query() query: PaginationQueryDto) {
    return this.docsService.list(getSessionUserId(session), query);
  }

  @Get(':id')
  getById(@Session() session: AuthSession, @Param('id') id: string) {
    return this.docsService.getById(getSessionUserId(session), id);
  }

  @Patch(':id')
  updateMetadata(
    @Session() session: AuthSession,
    @Param('id') id: string,
    @Body() dto: UpdateDocDto,
  ) {
    return this.docsService.updateMetadata(getSessionUserId(session), id, dto);
  }

  @Post(':id/versions')
  createVersion(
    @Session() session: AuthSession,
    @Param('id') id: string,
    @Body() dto: CreateDocVersionDto,
  ) {
    return this.docsService.createVersion(getSessionUserId(session), id, dto);
  }

  @Get(':id/versions/:versionNumber')
  getVersion(
    @Session() session: AuthSession,
    @Param('id') id: string,
    @Param('versionNumber', ParseIntPipe) versionNumber: number,
  ) {
    return this.docsService.getVersion(
      getSessionUserId(session),
      id,
      versionNumber,
    );
  }

  @Post('plan-version-links')
  linkToPlanVersion(
    @Session() session: AuthSession,
    @Body() dto: LinkPlanVersionDocDto,
  ) {
    return this.docsService.linkToPlanVersion(getSessionUserId(session), dto);
  }

  @Delete(':id')
  softDelete(@Session() session: AuthSession, @Param('id') id: string) {
    return this.docsService.softDelete(getSessionUserId(session), id);
  }
}
