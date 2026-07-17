import { Injectable, NotFoundException } from '@nestjs/common';
import { DocType } from '@prisma/client';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDocDto } from './dto/create-doc.dto';
import { CreateDocVersionDto } from './dto/create-doc-version.dto';
import { LinkPlanVersionDocDto } from './dto/link-plan-version-doc.dto';
import { UpdateDocDto } from './dto/update-doc.dto';

@Injectable()
export class DocsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateDocDto) {
    if (dto.taskId) {
      await this.ensureTaskOwned(userId, dto.taskId);
    }

    return this.prisma.$transaction(async (tx) => {
      const doc = await tx.doc.create({
        data: {
          userId,
          taskId: dto.taskId,
          title: dto.title,
          docType: dto.docType ?? DocType.OTHER,
        },
      });

      const currentVersion = await tx.docVersion.create({
        data: {
          docId: doc.id,
          versionNumber: 1,
          content: dto.content,
          changeSummary: dto.changeSummary ?? 'Initial version',
        },
      });

      return { ...doc, currentVersion, versions: [currentVersion] };
    });
  }

  async list(userId: string, query: PaginationQueryDto) {
    const where = { userId, deletedAt: null };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.doc.findMany({
        where,
        include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } },
        orderBy: { updatedAt: 'desc' },
        skip: query.offset,
        take: query.limit,
      }),
      this.prisma.doc.count({ where }),
    ]);

    return {
      items: items.map((doc) => ({
        ...doc,
        currentVersion: doc.versions[0] ?? null,
      })),
      total,
      limit: query.limit,
      offset: query.offset,
    };
  }

  async getById(userId: string, id: string) {
    const doc = await this.prisma.doc.findFirst({
      where: { id, userId, deletedAt: null },
      include: {
        versions: { orderBy: { versionNumber: 'desc' } },
        planVersionUse: {
          include: { planVersion: true, docVersion: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!doc) {
      throw new NotFoundException('Doc not found');
    }

    return { ...doc, currentVersion: doc.versions[0] ?? null };
  }

  async updateMetadata(userId: string, id: string, dto: UpdateDocDto) {
    await this.getById(userId, id);

    if (dto.taskId) {
      await this.ensureTaskOwned(userId, dto.taskId);
    }

    return this.prisma.doc.update({
      where: { id },
      data: {
        title: dto.title,
        docType: dto.docType,
        taskId: dto.taskId,
      },
    });
  }

  async createVersion(userId: string, docId: string, dto: CreateDocVersionDto) {
    await this.getById(userId, docId);

    return this.prisma.$transaction(async (tx) => {
      const previousVersion = await tx.docVersion.findFirst({
        where: { docId },
        orderBy: { versionNumber: 'desc' },
      });

      return tx.docVersion.create({
        data: {
          docId,
          versionNumber: (previousVersion?.versionNumber ?? 0) + 1,
          content: dto.content,
          changeSummary: dto.changeSummary,
        },
      });
    });
  }

  async getVersion(userId: string, docId: string, versionNumber: number) {
    await this.getById(userId, docId);

    const version = await this.prisma.docVersion.findFirst({
      where: { docId, versionNumber },
    });

    if (!version) {
      throw new NotFoundException('Doc version not found');
    }

    return version;
  }

  async linkToPlanVersion(userId: string, dto: LinkPlanVersionDocDto) {
    await this.ensurePlanVersionOwned(userId, dto.planVersionId);
    await this.getById(userId, dto.docId);

    const docVersionId =
      dto.docVersionId ?? (await this.getLatestDocVersionId(dto.docId));

    if (docVersionId) {
      await this.ensureDocVersionOwned(userId, docVersionId, dto.docId);
    }

    return this.prisma.planVersionDoc.upsert({
      where: {
        planVersionId_docId_role: {
          planVersionId: dto.planVersionId,
          docId: dto.docId,
          role: dto.role,
        },
      },
      create: {
        planVersionId: dto.planVersionId,
        docId: dto.docId,
        docVersionId,
        role: dto.role,
      },
      update: { docVersionId },
      include: { doc: true, docVersion: true, planVersion: true },
    });
  }

  async softDelete(userId: string, id: string) {
    await this.getById(userId, id);

    return this.prisma.doc.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private async getLatestDocVersionId(docId: string) {
    const version = await this.prisma.docVersion.findFirst({
      where: { docId },
      orderBy: { versionNumber: 'desc' },
    });

    if (!version) {
      throw new NotFoundException('Doc version not found');
    }

    return version.id;
  }

  private async ensureTaskOwned(userId: string, taskId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, userId, deletedAt: null },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }
  }

  private async ensurePlanVersionOwned(userId: string, planVersionId: string) {
    const version = await this.prisma.planVersion.findFirst({
      where: {
        id: planVersionId,
        plan: { deletedAt: null, task: { userId, deletedAt: null } },
      },
    });

    if (!version) {
      throw new NotFoundException('Plan version not found');
    }
  }

  private async ensureDocVersionOwned(
    userId: string,
    docVersionId: string,
    docId: string,
  ) {
    const version = await this.prisma.docVersion.findFirst({
      where: {
        id: docVersionId,
        docId,
        doc: { userId, deletedAt: null },
      },
    });

    if (!version) {
      throw new NotFoundException('Doc version not found');
    }
  }
}
