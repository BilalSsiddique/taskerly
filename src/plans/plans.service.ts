import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PlanStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { CreatePlanVersionDto } from './dto/create-plan-version.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { generatePlanIdentityKey } from './identity-key';

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreatePlanDto) {
    await this.ensureTaskOwned(userId, dto.taskId);

    const activePlan = await this.prisma.plan.findFirst({
      where: { taskId: dto.taskId, status: PlanStatus.ACTIVE, deletedAt: null },
    });

    if (activePlan && !dto.previousPlanStatus) {
      throw new ConflictException(
        'Task already has an active plan. Provide previousPlanStatus to supersede or abandon it.',
      );
    }

    if (dto.previousPlanStatus === PlanStatus.ACTIVE) {
      throw new BadRequestException('previousPlanStatus cannot be ACTIVE');
    }

    return this.prisma.$transaction(async (tx) => {
      if (activePlan && dto.previousPlanStatus) {
        await tx.plan.update({
          where: { id: activePlan.id },
          data: { status: dto.previousPlanStatus },
        });
      }

      const plan = await tx.plan.create({
        data: {
          taskId: dto.taskId,
          title: dto.title,
          identityKey: await this.createUniqueIdentityKey(tx, dto.title),
        },
      });

      const currentVersion = await tx.planVersion.create({
        data: {
          planId: plan.id,
          versionNumber: 1,
          content: dto.content,
          changeSummary: dto.changeSummary ?? 'Initial version',
        },
      });

      return { ...plan, currentVersion, versions: [currentVersion] };
    });
  }

  async listByTask(userId: string, taskId: string) {
    await this.ensureTaskOwned(userId, taskId);

    const plans = await this.prisma.plan.findMany({
      where: { taskId, deletedAt: null },
      include: {
        versions: { orderBy: { versionNumber: 'desc' } },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });

    return plans.map((plan) => ({
      ...plan,
      currentVersion: plan.versions[0] ?? null,
    }));
  }

  async getById(userId: string, id: string) {
    const plan = await this.prisma.plan.findFirst({
      where: { id, deletedAt: null, task: { userId, deletedAt: null } },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          include: {
            docLinks: {
              include: { doc: true, docVersion: true },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    return { ...plan, currentVersion: plan.versions[0] ?? null };
  }

  async updateMetadata(userId: string, id: string, dto: UpdatePlanDto) {
    await this.getById(userId, id);

    return this.prisma.plan.update({
      where: { id },
      data: {
        title: dto.title,
        status: dto.status,
      },
    });
  }

  async createVersion(
    userId: string,
    planId: string,
    dto: CreatePlanVersionDto,
  ) {
    await this.getById(userId, planId);

    return this.prisma.$transaction(async (tx) => {
      const previousVersion = await tx.planVersion.findFirst({
        where: { planId },
        orderBy: { versionNumber: 'desc' },
        include: { docLinks: true },
      });

      const nextVersion = await tx.planVersion.create({
        data: {
          planId,
          versionNumber: (previousVersion?.versionNumber ?? 0) + 1,
          content: dto.content,
          changeSummary: dto.changeSummary,
        },
      });

      if (previousVersion?.docLinks.length) {
        await tx.planVersionDoc.createMany({
          data: previousVersion.docLinks.map((link) => ({
            planVersionId: nextVersion.id,
            docId: link.docId,
            docVersionId: link.docVersionId,
            role: link.role,
          })),
          skipDuplicates: true,
        });
      }

      return tx.planVersion.findUnique({
        where: { id: nextVersion.id },
        include: {
          docLinks: { include: { doc: true, docVersion: true } },
        },
      });
    });
  }

  async getVersion(userId: string, planId: string, versionNumber: number) {
    await this.getById(userId, planId);

    const version = await this.prisma.planVersion.findFirst({
      where: { planId, versionNumber },
      include: {
        docLinks: { include: { doc: true, docVersion: true } },
      },
    });

    if (!version) {
      throw new NotFoundException('Plan version not found');
    }

    return version;
  }

  async softDelete(userId: string, id: string) {
    await this.getById(userId, id);

    return this.prisma.plan.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async ensurePlanVersionOwned(userId: string, planVersionId: string) {
    const version = await this.prisma.planVersion.findFirst({
      where: {
        id: planVersionId,
        plan: { deletedAt: null, task: { userId, deletedAt: null } },
      },
    });

    if (!version) {
      throw new NotFoundException('Plan version not found');
    }

    return version;
  }

  private async ensureTaskOwned(userId: string, taskId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, userId, deletedAt: null },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }
  }

  private async createUniqueIdentityKey(
    tx: Prisma.TransactionClient,
    title: string,
  ) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const identityKey = generatePlanIdentityKey(title);
      const existing = await tx.plan.findUnique({ where: { identityKey } });

      if (!existing) {
        return identityKey;
      }
    }

    throw new ConflictException(
      'Could not generate a unique plan identity key',
    );
  }
}
