import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DocsController } from './docs.controller';
import { DocsService } from './docs.service';

@Module({
  imports: [PrismaModule],
  controllers: [DocsController],
  providers: [DocsService],
  exports: [DocsService],
})
export class DocsModule {}
