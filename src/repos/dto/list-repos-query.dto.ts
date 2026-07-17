import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

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

export class ListReposQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  isPinned?: boolean;
}
