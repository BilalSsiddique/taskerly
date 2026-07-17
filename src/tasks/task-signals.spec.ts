import { TaskStatus } from '@prisma/client';
import { computeTaskSignals } from './task-signals';

describe('computeTaskSignals', () => {
  const now = new Date('2026-07-17T12:00:00.000Z');

  it('marks active tasks without context as stale', () => {
    const signals = computeTaskSignals(
      {
        status: TaskStatus.IN_PROGRESS,
        dueAt: null,
        updatedAt: now,
        lastContext: null,
        latestPlanVersionAt: now,
      },
      now,
    );

    expect(signals.isStale).toBe(true);
    expect(signals.staleReason).toBe('NO_CONTEXT');
  });

  it('marks overdue, today, and week due dates', () => {
    const overdue = computeTaskSignals(
      {
        status: TaskStatus.PLANNED,
        dueAt: new Date('2026-07-16T09:00:00.000Z'),
        updatedAt: now,
        lastContext: 'Ready',
      },
      now,
    );
    const today = computeTaskSignals(
      {
        status: TaskStatus.PLANNED,
        dueAt: new Date('2026-07-17T18:00:00.000Z'),
        updatedAt: now,
        lastContext: 'Ready',
      },
      now,
    );
    const week = computeTaskSignals(
      {
        status: TaskStatus.PLANNED,
        dueAt: new Date('2026-07-22T18:00:00.000Z'),
        updatedAt: now,
        lastContext: 'Ready',
      },
      now,
    );

    expect(overdue.isOverdue).toBe(true);
    expect(today.isDueToday).toBe(true);
    expect(week.isDueThisWeek).toBe(true);
  });

  it('uses latest related activity for lastActivityAt', () => {
    const signals = computeTaskSignals(
      {
        status: TaskStatus.PLANNED,
        dueAt: null,
        updatedAt: new Date('2026-07-10T12:00:00.000Z'),
        lastContext: 'Ready',
        latestPlanVersionAt: new Date('2026-07-12T12:00:00.000Z'),
        latestDocVersionAt: new Date('2026-07-15T12:00:00.000Z'),
        latestReferenceAt: new Date('2026-07-14T12:00:00.000Z'),
      },
      now,
    );

    expect(signals.lastActivityAt).toEqual(
      new Date('2026-07-15T12:00:00.000Z'),
    );
  });
});
