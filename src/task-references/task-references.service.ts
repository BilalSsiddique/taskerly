import { Injectable, NotFoundException } from '@nestjs/common';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskReferenceDto } from './dto/create-task-reference.dto';
import { UpdateTaskReferenceDto } from './dto/update-task-reference.dto';

@Injectable()
export class TaskReferencesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateTaskReferenceDto) {
    await this.ensureTaskOwned(userId, dto.taskId);

    return this.prisma.taskReference.create({ data: dto });
  }

  async listByTask(userId: string, taskId: string, query: PaginationQueryDto) {
    await this.ensureTaskOwned(userId, taskId);

    const where = { taskId };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.taskReference.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.offset,
        take: query.limit,
      }),
      this.prisma.taskReference.count({ where }),
    ]);

    return { items, total, limit: query.limit, offset: query.offset };
  }

  async getById(userId: string, id: string) {
    const reference = await this.prisma.taskReference.findFirst({
      where: { id, task: { userId, deletedAt: null } },
    });

    if (!reference) {
      throw new NotFoundException('Task reference not found');
    }

    return reference;
  }

  async update(userId: string, id: string, dto: UpdateTaskReferenceDto) {
    const reference = await this.getById(userId, id);

    if (dto.taskId && dto.taskId !== reference.taskId) {
      await this.ensureTaskOwned(userId, dto.taskId);
    }

    return this.prisma.taskReference.update({
      where: { id },
      data: dto,
    });
  }

  async delete(userId: string, id: string) {
    await this.getById(userId, id);

    return this.prisma.taskReference.delete({ where: { id } });
  }

  private async ensureTaskOwned(userId: string, taskId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, userId, deletedAt: null },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }
  }
}
