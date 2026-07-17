import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export class ListTasksQueryDto extends PaginationQueryDto {
  @ApiProperty()
  @IsUUID()
  repoId: string;
}
