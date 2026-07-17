/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { ConflictException, NotFoundException } from '@nestjs/common';
import { PlanDocRole, PlanStatus } from '@prisma/client';
import { PlansService } from './plans.service';

describe('PlansService', () => {
  const userId = 'user-1';
  const taskId = '11111111-1111-1111-1111-111111111111';
  const planId = '22222222-2222-2222-2222-222222222222';

  function createPrismaMock() {
    const tx = {
      plan: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      planVersion: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
      },
      planVersionDoc: {
        createMany: jest.fn(),
      },
    };

    return {
      tx,
      prisma: {
        task: { findFirst: jest.fn() },
        plan: {
          findFirst: jest.fn(),
          findMany: jest.fn(),
          update: jest.fn(),
        },
        planVersion: {
          findFirst: jest.fn(),
        },
        $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) =>
          callback(tx),
        ),
      },
    };
  }

  it('creates a plan and initial immutable version in one transaction', async () => {
    const { prisma, tx } = createPrismaMock();
    const service = new PlansService(prisma as never);

    prisma.task.findFirst.mockResolvedValue({ id: taskId });
    prisma.plan.findFirst.mockResolvedValue(null);
    tx.plan.findUnique.mockResolvedValue(null);
    tx.plan.create.mockResolvedValue({
      id: planId,
      taskId,
      title: 'Stripe migration',
      identityKey: 'PLN-STRIPE_MIGRATION-ABC123',
      status: PlanStatus.ACTIVE,
    });
    tx.planVersion.create.mockResolvedValue({
      id: 'version-1',
      planId,
      versionNumber: 1,
      content: 'v1 content',
    });

    const result = await service.create(userId, {
      taskId,
      title: 'Stripe migration',
      content: 'v1 content',
    });

    expect(tx.plan.create).toHaveBeenCalled();
    expect(tx.planVersion.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        planId,
        versionNumber: 1,
        content: 'v1 content',
      }),
    });
    expect(result.currentVersion.versionNumber).toBe(1);
  });

  it('rejects a second active plan without explicit previousPlanStatus', async () => {
    const { prisma } = createPrismaMock();
    const service = new PlansService(prisma as never);

    prisma.task.findFirst.mockResolvedValue({ id: taskId });
    prisma.plan.findFirst.mockResolvedValue({ id: planId });

    await expect(
      service.create(userId, {
        taskId,
        title: 'New approach',
        content: 'content',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('carries doc links forward when creating a new plan version', async () => {
    const { prisma, tx } = createPrismaMock();
    const service = new PlansService(prisma as never);

    prisma.plan.findFirst.mockResolvedValue({
      id: planId,
      versions: [{ id: 'version-1', versionNumber: 1 }],
    });
    tx.planVersion.findFirst.mockResolvedValue({
      id: 'version-1',
      planId,
      versionNumber: 1,
      docLinks: [
        {
          docId: 'doc-1',
          docVersionId: 'doc-version-1',
          role: PlanDocRole.FE_INTEGRATION,
        },
      ],
    });
    tx.planVersion.create.mockResolvedValue({
      id: 'version-2',
      planId,
      versionNumber: 2,
      content: 'v2 content',
    });
    tx.planVersion.findUnique.mockResolvedValue({
      id: 'version-2',
      versionNumber: 2,
      docLinks: [
        {
          docId: 'doc-1',
          docVersionId: 'doc-version-1',
          role: PlanDocRole.FE_INTEGRATION,
        },
      ],
    });

    const result = await service.createVersion(userId, planId, {
      content: 'v2 content',
      changeSummary: 'Updated plan',
    });

    expect(tx.planVersionDoc.createMany).toHaveBeenCalledWith({
      data: [
        {
          planVersionId: 'version-2',
          docId: 'doc-1',
          docVersionId: 'doc-version-1',
          role: PlanDocRole.FE_INTEGRATION,
        },
      ],
      skipDuplicates: true,
    });
    expect(result?.versionNumber).toBe(2);
  });

  it('enforces ownership when resolving plan versions', async () => {
    const { prisma } = createPrismaMock();
    const service = new PlansService(prisma as never);

    prisma.planVersion.findFirst.mockResolvedValue(null);

    await expect(
      service.ensurePlanVersionOwned(userId, 'missing-version'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
