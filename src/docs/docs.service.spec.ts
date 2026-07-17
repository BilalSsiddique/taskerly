/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */
import { NotFoundException } from '@nestjs/common';
import { DocType, PlanDocRole } from '@prisma/client';
import { DocsService } from './docs.service';

describe('DocsService', () => {
  const userId = 'user-1';
  const docId = '11111111-1111-1111-1111-111111111111';

  function createPrismaMock() {
    const tx = {
      doc: { create: jest.fn() },
      docVersion: {
        create: jest.fn(),
        findFirst: jest.fn(),
      },
    };

    return {
      tx,
      prisma: {
        task: { findFirst: jest.fn() },
        doc: {
          findFirst: jest.fn(),
          findMany: jest.fn(),
          count: jest.fn(),
          update: jest.fn(),
        },
        docVersion: {
          findFirst: jest.fn(),
          create: jest.fn(),
        },
        planVersion: { findFirst: jest.fn() },
        planVersionDoc: { upsert: jest.fn() },
        $transaction: jest.fn((input: unknown) => {
          if (typeof input === 'function') {
            return input(tx);
          }

          return Promise.all(input as Promise<unknown>[]);
        }),
      },
    };
  }

  it('creates a doc and initial version in one transaction', async () => {
    const { prisma, tx } = createPrismaMock();
    const service = new DocsService(prisma as never);

    tx.doc.create.mockResolvedValue({
      id: docId,
      userId,
      title: 'FE integration',
      docType: DocType.FE_INTEGRATION,
    });
    tx.docVersion.create.mockResolvedValue({
      id: 'doc-version-1',
      docId,
      versionNumber: 1,
      content: 'doc v1',
    });

    const result = await service.create(userId, {
      title: 'FE integration',
      docType: DocType.FE_INTEGRATION,
      content: 'doc v1',
    });

    expect(tx.doc.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId, title: 'FE integration' }),
    });
    expect(tx.docVersion.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ docId, versionNumber: 1 }),
    });
    expect(result.currentVersion.versionNumber).toBe(1);
  });

  it('creates a new doc version without mutating prior versions', async () => {
    const { prisma, tx } = createPrismaMock();
    const service = new DocsService(prisma as never);

    prisma.doc.findFirst.mockResolvedValue({
      id: docId,
      userId,
      versions: [{ versionNumber: 1 }],
      planVersionUse: [],
    });
    tx.docVersion.findFirst.mockResolvedValue({ versionNumber: 1 });
    tx.docVersion.create.mockResolvedValue({
      id: 'doc-version-2',
      docId,
      versionNumber: 2,
      content: 'doc v2',
    });

    const result = await service.createVersion(userId, docId, {
      content: 'doc v2',
      changeSummary: 'Updated',
    });

    expect(tx.docVersion.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        docId,
        versionNumber: 2,
        content: 'doc v2',
      }),
    });
    expect(result.versionNumber).toBe(2);
  });

  it('pins latest doc version when linking to a plan version', async () => {
    const { prisma } = createPrismaMock();
    const service = new DocsService(prisma as never);

    prisma.planVersion.findFirst.mockResolvedValue({ id: 'plan-version-1' });
    prisma.doc.findFirst.mockResolvedValue({
      id: docId,
      userId,
      versions: [{ id: 'doc-version-1', versionNumber: 1 }],
      planVersionUse: [],
    });
    prisma.docVersion.findFirst.mockResolvedValue({
      id: 'doc-version-1',
      docId,
    });
    prisma.planVersionDoc.upsert.mockResolvedValue({
      id: 'link-1',
      docVersionId: 'doc-version-1',
    });

    const result = await service.linkToPlanVersion(userId, {
      planVersionId: 'plan-version-1',
      docId,
      role: PlanDocRole.FE_INTEGRATION,
    });

    expect(prisma.planVersionDoc.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ docVersionId: 'doc-version-1' }),
      }),
    );
    expect(result.docVersionId).toBe('doc-version-1');
  });

  it('enforces ownership for plan version links', async () => {
    const { prisma } = createPrismaMock();
    const service = new DocsService(prisma as never);

    prisma.planVersion.findFirst.mockResolvedValue(null);

    await expect(
      service.linkToPlanVersion(userId, {
        planVersionId: 'foreign-plan-version',
        docId,
        role: PlanDocRole.OTHER,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
