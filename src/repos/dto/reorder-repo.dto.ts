import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber } from 'class-validator';

export class ReorderRepoDto {
  @ApiProperty({ example: 500 })
  @Type(() => Number)
  @IsNumber()
  order: number;
}
