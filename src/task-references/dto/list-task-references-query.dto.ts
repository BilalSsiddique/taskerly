import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export class ListTaskReferencesQueryDto extends PaginationQueryDto {
  @ApiProperty()
  @IsUUID()
  taskId: string;
}
