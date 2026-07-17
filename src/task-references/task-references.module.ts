import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TaskReferencesController } from './task-references.controller';
import { TaskReferencesService } from './task-references.service';

@Module({
  imports: [PrismaModule],
  controllers: [TaskReferencesController],
  providers: [TaskReferencesService],
})
export class TaskReferencesModule {}
