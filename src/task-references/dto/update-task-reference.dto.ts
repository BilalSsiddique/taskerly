import { PartialType } from '@nestjs/swagger';
import { CreateTaskReferenceDto } from './create-task-reference.dto';

export class UpdateTaskReferenceDto extends PartialType(
  CreateTaskReferenceDto,
) {}
