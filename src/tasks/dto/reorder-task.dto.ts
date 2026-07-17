import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber } from 'class-validator';

export class ReorderTaskDto {
  @ApiProperty({ example: 750 })
  @Type(() => Number)
  @IsNumber()
  order: number;
}
