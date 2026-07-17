import { TaskStatus } from '@prisma/client';

export const TASK_STALE_DAYS = 7;

export type TaskSignalSource = {
  status: TaskStatus;
  dueAt: Date | string | null;
  updatedAt: Date | string;
  lastContext: string | null;
  lastContextUpdatedAt?: Date | string | null;
  latestPlanVersionAt?: Date | string | null;
  latestDocVersionAt?: Date | string | null;
  latestReferenceAt?: Date | string | null;
};

export type TaskSignals = {
  isOverdue: boolean;
  isDueToday: boolean;
  isDueThisWeek: boolean;
  isStale: boolean;
  staleReason: 'NO_CONTEXT' | 'OLD_CONTEXT' | 'NO_PLAN_ACTIVITY' | null;
  daysSinceTaskUpdate: number;
  daysSinceLastContextUpdate: number | null;
  daysUntilDue: number | null;
  lastActivityAt: Date;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const ACTIVE_STALE_STATUSES = new Set<TaskStatus>([
  TaskStatus.BACKLOG,
  TaskStatus.PLANNED,
  TaskStatus.IN_PROGRESS,
  TaskStatus.BLOCKED,
]);
const PLAN_STALE_STATUSES = new Set<TaskStatus>([
  TaskStatus.IN_PROGRESS,
  TaskStatus.BLOCKED,
]);

export function getStartOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function differenceInCalendarDays(to: Date, from: Date) {
  const toStart = getStartOfDay(to).getTime();
  const fromStart = getStartOfDay(from).getTime();
  return Math.round((toStart - fromStart) / DAY_MS);
}

export function computeTaskSignals(
  source: TaskSignalSource,
  now = new Date(),
): TaskSignals {
  const updatedAt = new Date(source.updatedAt);
  const dueAt = source.dueAt ? new Date(source.dueAt) : null;
  const latestPlanVersionAt = source.latestPlanVersionAt
    ? new Date(source.latestPlanVersionAt)
    : null;
  const latestDocVersionAt = source.latestDocVersionAt
    ? new Date(source.latestDocVersionAt)
    : null;
  const latestReferenceAt = source.latestReferenceAt
    ? new Date(source.latestReferenceAt)
    : null;
  const lastContextUpdatedAt = source.lastContextUpdatedAt
    ? new Date(source.lastContextUpdatedAt)
    : null;

  const lastActivityAt = [
    updatedAt,
    latestPlanVersionAt,
    latestDocVersionAt,
    latestReferenceAt,
  ]
    .filter((value): value is Date => value !== null)
    .sort((a, b) => b.getTime() - a.getTime())[0];

  const today = getStartOfDay(now);
  const tomorrow = addDays(today, 1);
  const nextWeek = addDays(today, 7);
  const daysSinceTaskUpdate = differenceInCalendarDays(now, updatedAt);
  const daysSinceLastContextUpdate = lastContextUpdatedAt
    ? differenceInCalendarDays(now, lastContextUpdatedAt)
    : null;
  const daysUntilDue = dueAt ? differenceInCalendarDays(dueAt, now) : null;
  const isActive = ACTIVE_STALE_STATUSES.has(source.status);
  const hasContext = Boolean(source.lastContext?.trim());

  const isOverdue = Boolean(dueAt && dueAt < today);
  const isDueToday = Boolean(dueAt && dueAt >= today && dueAt < tomorrow);
  const isDueThisWeek = Boolean(dueAt && dueAt >= today && dueAt < nextWeek);

  let staleReason: TaskSignals['staleReason'] = null;

  if (isActive && !hasContext) {
    staleReason = 'NO_CONTEXT';
  } else if (
    isActive &&
    daysSinceLastContextUpdate !== null &&
    daysSinceLastContextUpdate >= TASK_STALE_DAYS
  ) {
    staleReason = 'OLD_CONTEXT';
  } else if (
    PLAN_STALE_STATUSES.has(source.status) &&
    (!latestPlanVersionAt ||
      differenceInCalendarDays(now, latestPlanVersionAt) >= TASK_STALE_DAYS)
  ) {
    staleReason = 'NO_PLAN_ACTIVITY';
  }

  return {
    isOverdue,
    isDueToday,
    isDueThisWeek,
    isStale: staleReason !== null,
    staleReason,
    daysSinceTaskUpdate,
    daysSinceLastContextUpdate: hasContext ? daysSinceLastContextUpdate : null,
    daysUntilDue,
    lastActivityAt,
  };
}
