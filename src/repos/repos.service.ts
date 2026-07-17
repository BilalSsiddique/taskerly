import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { slugify } from '../common/utils/slug';
import { CreateRepoDto } from './dto/create-repo.dto';
import { ListReposQueryDto } from './dto/list-repos-query.dto';
import { UpdateRepoDto } from './dto/update-repo.dto';

@Injectable()
export class ReposService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateRepoDto) {
    const slug = slugify(dto.name);

    try {
      return await this.prisma.repo.create({
        data: {
          userId,
          name: dto.name,
          slug,
          description: dto.description,
          color: dto.color,
          isPinned: dto.isPinned ?? false,
          pinnedAt: dto.isPinned ? new Date() : null,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('A repo with this slug already exists');
      }

      throw error;
    }
  }

  async list(userId: string, query: ListReposQueryDto) {
    const where: Prisma.RepoWhereInput = {
      userId,
      deletedAt: null,
      isPinned: query.isPinned,
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.repo.findMany({
        where,
        orderBy: [
          { isPinned: 'desc' },
          { order: 'asc' },
          { createdAt: 'desc' },
        ],
        skip: query.offset,
        take: query.limit,
      }),
      this.prisma.repo.count({ where }),
    ]);

    return { items, total, limit: query.limit, offset: query.offset };
  }

  async getById(userId: string, id: string) {
    const repo = await this.prisma.repo.findFirst({
      where: { id, userId, deletedAt: null },
      include: {
        tasks: {
          where: { deletedAt: null },
          orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
        },
      },
    });

    if (!repo) {
      throw new NotFoundException('Repo not found');
    }

    return repo;
  }

  async update(userId: string, id: string, dto: UpdateRepoDto) {
    await this.getById(userId, id);

    const data: Prisma.RepoUpdateInput = {
      name: dto.name,
      description: dto.description,
      color: dto.color,
    };

    if (dto.name) {
      data.slug = slugify(dto.name);
    }

    if (dto.isPinned !== undefined) {
      data.isPinned = dto.isPinned;
      data.pinnedAt = dto.isPinned ? new Date() : null;
    }

    try {
      return await this.prisma.repo.update({ where: { id }, data });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('A repo with this slug already exists');
      }

      throw error;
    }
  }

  async reorder(userId: string, id: string, order: number) {
    await this.getById(userId, id);

    return this.prisma.repo.update({
      where: { id },
      data: { order },
    });
  }

  async softDelete(userId: string, id: string) {
    await this.getById(userId, id);

    return this.prisma.repo.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
