import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { slugify } from '../common/utils/slug';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { ListProjectsQueryDto } from './dto/list-projects-query.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateProjectDto) {
    const slug = slugify(dto.name);

    try {
      return await this.prisma.project.create({
        data: {
          userId,
          name: dto.name,
          slug,
          description: dto.description,
          category: dto.category,
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
        throw new ConflictException('A project with this slug already exists');
      }

      throw error;
    }
  }

  async list(userId: string, query: ListProjectsQueryDto) {
    const where: Prisma.ProjectWhereInput = {
      userId,
      deletedAt: null,
      isPinned: query.isPinned,
      category: query.category,
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.project.findMany({
        where,
        orderBy: [
          { isPinned: 'desc' },
          { order: 'asc' },
          { createdAt: 'desc' },
        ],
        skip: query.offset,
        take: query.limit,
      }),
      this.prisma.project.count({ where }),
    ]);

    return { items, total, limit: query.limit, offset: query.offset };
  }

  async getById(userId: string, id: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, userId, deletedAt: null },
      include: {
        repos: {
          where: { deletedAt: null },
          orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }

  async update(userId: string, id: string, dto: UpdateProjectDto) {
    await this.getById(userId, id);

    const data: Prisma.ProjectUpdateInput = {
      name: dto.name,
      description: dto.description,
      category: dto.category,
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
      return await this.prisma.project.update({ where: { id }, data });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('A project with this slug already exists');
      }

      throw error;
    }
  }

  async softDelete(userId: string, id: string) {
    await this.getById(userId, id);

    return this.prisma.project.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async ensureProjectOwned(userId: string, id: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, userId, deletedAt: null },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }
}
