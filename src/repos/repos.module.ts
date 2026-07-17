import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ReposController } from './repos.controller';
import { ReposService } from './repos.service';

@Module({
  imports: [PrismaModule],
  controllers: [ReposController],
  providers: [ReposService],
  exports: [ReposService],
})
export class ReposModule {}
