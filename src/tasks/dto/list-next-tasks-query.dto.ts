import { ApiPropertyOptional } from '@nestjs/swagger';
import { PriorityLevel, ProjectCategory, TaskStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export enum DueFilter {
  OVERDUE = 'overdue',
  TODAY = 'today',
  WEEK = 'week',
  NONE = 'none',
  ANY = 'any',
}

export enum NextTasksSort {
  RECOMMENDED = 'recommended',
  PRIORITY = 'priority',
  ORDER = 'order',
  UPDATED_AT = 'updatedAt',
  DUE_AT = 'dueAt',
  STALE = 'stale',
}

const toArray = (value: unknown) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) =>
      typeof item === 'string' || typeof item === 'number'
        ? String(item).split(',')
        : [],
    );
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return String(value).split(',');
  }

  return undefined;
};

const toBoolean = (value: unknown) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const normalized = String(value).toLowerCase();

    if (['true', '1'].includes(normalized)) {
      return true;
    }

    if (['false', '0'].includes(normalized)) {
      return false;
    }
  }

  return value;
};

export class ListNextTasksQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: TaskStatus, isArray: true })
  @IsOptional()
  @Transform(({ value }) => toArray(value))
  @IsEnum(TaskStatus, { each: true })
  status?: TaskStatus[];

  @ApiPropertyOptional({ enum: PriorityLevel, isArray: true })
  @IsOptional()
  @Transform(({ value }) => toArray(value))
  @IsEnum(PriorityLevel, { each: true })
  priority?: PriorityLevel[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  repoId?: string;

  @ApiPropertyOptional({ enum: ProjectCategory })
  @IsOptional()
  @IsEnum(ProjectCategory)
  projectCategory?: ProjectCategory;

  @ApiPropertyOptional({ enum: DueFilter, default: DueFilter.ANY })
  @IsOptional()
  @IsEnum(DueFilter)
  due?: DueFilter = DueFilter.ANY;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  stale?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  pinned?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  includeDone?: boolean;

  @ApiPropertyOptional({
    enum: NextTasksSort,
    default: NextTasksSort.RECOMMENDED,
  })
  @IsOptional()
  @IsEnum(NextTasksSort)
  sort?: NextTasksSort = NextTasksSort.RECOMMENDED;
}
