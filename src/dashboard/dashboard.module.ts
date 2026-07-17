import { Module } from '@nestjs/common';
import { TasksModule } from '../tasks/tasks.module';
import { DashboardController } from './dashboard.controller';

@Module({
  imports: [TasksModule],
  controllers: [DashboardController],
})
export class DashboardModule {}
