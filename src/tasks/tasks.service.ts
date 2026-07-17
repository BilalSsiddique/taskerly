import { Injectable, NotFoundException } from '@nestjs/common';
import { PlanStatus, Prisma, PriorityLevel, TaskStatus } from '@prisma/client';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import {
  DueFilter,
  ListNextTasksQueryDto,
  NextTasksSort,
} from './dto/list-next-tasks-query.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import {
  addDays,
  computeTaskSignals,
  getStartOfDay,
  TaskSignals,
} from './task-signals';

const PRIORITY_WEIGHT: Record<PriorityLevel, number> = {
  [PriorityLevel.URGENT]: 400,
  [PriorityLevel.HIGH]: 300,
  [PriorityLevel.MEDIUM]: 200,
  [PriorityLevel.LOW]: 100,
};

const STATUS_WEIGHT: Record<TaskStatus, number> = {
  [TaskStatus.IN_PROGRESS]: 400,
  [TaskStatus.BLOCKED]: 300,
  [TaskStatus.PLANNED]: 200,
  [TaskStatus.BACKLOG]: 100,
  [TaskStatus.DONE]: 0,
  [TaskStatus.ABANDONED]: 0,
};

type NextTaskCandidate = Prisma.TaskGetPayload<{
  include: {
    repo: true;
    references: { orderBy: { createdAt: 'desc' }; take: 1 };
    docs: {
      where: { deletedAt: null };
      include: { versions: { orderBy: { versionNumber: 'desc' }; take: 1 } };
    };
    plans: {
      where: { status: 'ACTIVE'; deletedAt: null };
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' };
          take: 1;
          include: { docLinks: true };
        };
        _count: { select: { versions: true } };
      };
      orderBy: { createdAt: 'desc' };
      take: 1;
    };
    _count: { select: { references: true; docs: true } };
  };
}>;

type NextTaskItem = {
  task: Omit<
    NextTaskCandidate,
    'repo' | 'references' | 'docs' | 'plans' | '_count'
  >;
  repo: Pick<
    NextTaskCandidate['repo'],
    'id' | 'name' | 'slug' | 'color' | 'isPinned'
  >;
  currentPlan: {
    id: string;
    identityKey: string;
    title: string;
    currentVersionNumber: number | null;
    updatedAt: Date;
  } | null;
  counts: {
    docs: number;
    references: number;
    planVersions: number;
  };
  signals: TaskSignals;
  recommendationScore: number;
};

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateTaskDto) {
    await this.ensureRepoOwned(userId, dto.repoId);

    return this.prisma.task.create({
      data: {
        userId,
        repoId: dto.repoId,
        title: dto.title,
        description: dto.description,
        status: dto.status ?? TaskStatus.BACKLOG,
        priority: dto.priority ?? PriorityLevel.MEDIUM,
        lastContext: dto.lastContext,
        dueAt: dto.dueAt,
        metadata: (dto.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  async listByRepo(userId: string, repoId: string, query: PaginationQueryDto) {
    await this.ensureRepoOwned(userId, repoId);

    const where = { userId, repoId, deletedAt: null };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.task.findMany({
        where,
        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
        skip: query.offset,
        take: query.limit,
      }),
      this.prisma.task.count({ where }),
    ]);

    return { items, total, limit: query.limit, offset: query.offset };
  }

  async listNext(userId: string, query: ListNextTasksQueryDto) {
    if (query.repoId) {
      await this.ensureRepoOwned(userId, query.repoId);
    }

    const where: Prisma.TaskWhereInput = {
      userId,
      deletedAt: null,
      repo: { deletedAt: null },
      repoId: query.repoId,
      priority: query.priority?.length ? { in: query.priority } : undefined,
      status: query.status?.length
        ? { in: query.status }
        : query.includeDone
          ? undefined
          : { notIn: [TaskStatus.DONE, TaskStatus.ABANDONED] },
      isPinned: query.pinned,
    };

    const candidates = await this.prisma.task.findMany({
      where,
      include: this.nextTaskInclude(),
      orderBy: [{ isPinned: 'desc' }, { order: 'asc' }, { updatedAt: 'desc' }],
    });

    const filtered = candidates
      .map((candidate) => this.toNextTaskItem(candidate))
      .filter((item) => this.matchesDueFilter(item, query.due ?? DueFilter.ANY))
      .filter((item) =>
        query.stale === undefined ? true : item.signals.isStale === query.stale,
      )
      .sort((a, b) => this.compareNextTaskItems(a, b, query.sort));

    return {
      items: filtered.slice(query.offset, query.offset + query.limit),
      total: filtered.length,
      limit: query.limit,
      offset: query.offset,
    };
  }

  async getById(userId: string, id: string) {
    const task = await this.prisma.task.findFirst({
      where: { id, userId, deletedAt: null },
      include: {
        repo: true,
        references: true,
        docs: {
          where: { deletedAt: null },
          include: { versions: { orderBy: { versionNumber: 'desc' } } },
        },
        plans: {
          where: { deletedAt: null },
          include: {
            versions: {
              orderBy: { versionNumber: 'desc' },
              include: {
                docLinks: {
                  include: { doc: true, docVersion: true },
                },
              },
            },
          },
          orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return task;
  }

  async getDetail(userId: string, id: string) {
    const task = await this.prisma.task.findFirst({
      where: { id, userId, deletedAt: null },
      include: {
        repo: true,
        references: { orderBy: { createdAt: 'desc' } },
        docs: {
          where: { deletedAt: null },
          include: { versions: { orderBy: { versionNumber: 'desc' } } },
          orderBy: { updatedAt: 'desc' },
        },
        plans: {
          where: { deletedAt: null },
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
          orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const activePlan =
      task.plans.find((plan) => plan.status === PlanStatus.ACTIVE) ?? null;
    const currentPlanVersion = activePlan?.versions[0] ?? null;
    const linkedDocs = currentPlanVersion?.docLinks ?? [];
    const latestDocVersionAt = task.docs
      .map((doc) => doc.versions[0]?.createdAt)
      .filter((date): date is Date => date instanceof Date)
      .sort((a, b) => b.getTime() - a.getTime())[0];

    const signals = computeTaskSignals({
      status: task.status,
      dueAt: task.dueAt,
      updatedAt: task.updatedAt,
      lastContext: task.lastContext,
      latestPlanVersionAt: currentPlanVersion?.createdAt,
      latestDocVersionAt,
      latestReferenceAt: task.references[0]?.createdAt,
    });

    const { repo, references, docs, plans: _plans, ...taskFields } = task;
    void _plans;

    return {
      task: taskFields,
      repo,
      activePlan,
      planVersions: activePlan?.versions ?? [],
      linkedDocs,
      taskDocs: docs,
      references,
      signals,
    };
  }

  async update(userId: string, id: string, dto: UpdateTaskDto) {
    const task = await this.getById(userId, id);

    if (dto.repoId && dto.repoId !== task.repoId) {
      await this.ensureRepoOwned(userId, dto.repoId);
    }

    const data: Prisma.TaskUpdateInput = {
      repo: dto.repoId ? { connect: { id: dto.repoId } } : undefined,
      title: dto.title,
      description: dto.description,
      status: dto.status,
      priority: dto.priority,
      lastContext: dto.lastContext,
      dueAt: dto.dueAt,
      metadata: dto.metadata as Prisma.InputJsonValue | undefined,
    };

    if (dto.status === TaskStatus.IN_PROGRESS && !task.startedAt) {
      data.startedAt = new Date();
    }

    if (dto.status === TaskStatus.DONE && !task.completedAt) {
      data.completedAt = new Date();
    }

    return this.prisma.task.update({ where: { id }, data });
  }

  async reorder(userId: string, id: string, order: number) {
    await this.getById(userId, id);

    return this.prisma.task.update({ where: { id }, data: { order } });
  }

  async setPinned(userId: string, id: string, isPinned: boolean) {
    await this.ensureTaskOwned(userId, id);

    return this.prisma.task.update({
      where: { id },
      data: {
        isPinned,
        pinnedAt: isPinned ? new Date() : null,
      },
    });
  }

  async getDashboardSummary(userId: string) {
    const openTasks = await this.prisma.task.findMany({
      where: {
        userId,
        deletedAt: null,
        repo: { deletedAt: null },
        status: { notIn: [TaskStatus.DONE, TaskStatus.ABANDONED] },
      },
      include: this.nextTaskInclude(),
    });
    const items = openTasks.map((task) => this.toNextTaskItem(task));
    const now = new Date();
    const startOfWeek = addDays(getStartOfDay(now), -6);
    const [doneThisWeek, totalRepos, pinnedRepos] =
      await this.prisma.$transaction([
        this.prisma.task.count({
          where: {
            userId,
            deletedAt: null,
            repo: { deletedAt: null },
            status: TaskStatus.DONE,
            completedAt: { gte: startOfWeek },
          },
        }),
        this.prisma.repo.count({ where: { userId, deletedAt: null } }),
        this.prisma.repo.count({
          where: { userId, deletedAt: null, isPinned: true },
        }),
      ]);

    return {
      tasks: {
        totalOpen: items.length,
        backlog: items.filter((item) => item.task.status === TaskStatus.BACKLOG)
          .length,
        planned: items.filter((item) => item.task.status === TaskStatus.PLANNED)
          .length,
        inProgress: items.filter(
          (item) => item.task.status === TaskStatus.IN_PROGRESS,
        ).length,
        blocked: items.filter((item) => item.task.status === TaskStatus.BLOCKED)
          .length,
        doneThisWeek,
      },
      signals: {
        overdue: items.filter((item) => item.signals.isOverdue).length,
        dueToday: items.filter((item) => item.signals.isDueToday).length,
        dueThisWeek: items.filter((item) => item.signals.isDueThisWeek).length,
        stale: items.filter((item) => item.signals.isStale).length,
        pinned: items.filter((item) => item.task.isPinned).length,
      },
      repos: {
        total: totalRepos,
        pinned: pinnedRepos,
      },
    };
  }

  async softDelete(userId: string, id: string) {
    await this.getById(userId, id);

    return this.prisma.task.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async ensureTaskOwned(userId: string, taskId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, userId, deletedAt: null },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return task;
  }

  private async ensureRepoOwned(userId: string, repoId: string) {
    const repo = await this.prisma.repo.findFirst({
      where: { id: repoId, userId, deletedAt: null },
    });

    if (!repo) {
      throw new NotFoundException('Repo not found');
    }

    return repo;
  }

  private nextTaskInclude() {
    return {
      repo: true,
      references: { orderBy: { createdAt: 'desc' }, take: 1 },
      docs: {
        where: { deletedAt: null },
        include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } },
      },
      plans: {
        where: { status: PlanStatus.ACTIVE, deletedAt: null },
        include: {
          versions: {
            orderBy: { versionNumber: 'desc' },
            take: 1,
            include: { docLinks: true },
          },
          _count: { select: { versions: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
      _count: { select: { references: true, docs: true } },
    } satisfies Prisma.TaskInclude;
  }

  private toNextTaskItem(candidate: NextTaskCandidate): NextTaskItem {
    const activePlan = candidate.plans[0] ?? null;
    const currentVersion = activePlan?.versions[0] ?? null;
    const latestDocVersionAt = candidate.docs
      .map((doc) => doc.versions[0]?.createdAt)
      .filter((date): date is Date => date instanceof Date)
      .sort((a, b) => b.getTime() - a.getTime())[0];
    const signals = computeTaskSignals({
      status: candidate.status,
      dueAt: candidate.dueAt,
      updatedAt: candidate.updatedAt,
      lastContext: candidate.lastContext,
      latestPlanVersionAt: currentVersion?.createdAt,
      latestDocVersionAt,
      latestReferenceAt: candidate.references[0]?.createdAt,
    });
    const { repo, references, docs, plans, _count, ...task } = candidate;
    void references;
    void docs;
    void plans;

    const item: NextTaskItem = {
      task,
      repo: {
        id: repo.id,
        name: repo.name,
        slug: repo.slug,
        color: repo.color,
        isPinned: repo.isPinned,
      },
      currentPlan: activePlan
        ? {
            id: activePlan.id,
            identityKey: activePlan.identityKey,
            title: activePlan.title,
            currentVersionNumber: currentVersion?.versionNumber ?? null,
            updatedAt: activePlan.updatedAt,
          }
        : null,
      counts: {
        docs: _count.docs,
        references: _count.references,
        planVersions: activePlan?._count.versions ?? 0,
      },
      signals,
      recommendationScore: 0,
    };

    return {
      ...item,
      recommendationScore: this.getRecommendationScore(item),
    };
  }

  private getRecommendationScore(
    item: Omit<NextTaskItem, 'recommendationScore'>,
  ) {
    return (
      (item.task.isPinned ? 10_000 : 0) +
      (item.signals.isOverdue ? 3_000 : 0) +
      (item.signals.isDueToday ? 2_000 : 0) +
      (item.signals.isDueThisWeek ? 1_000 : 0) +
      PRIORITY_WEIGHT[item.task.priority] +
      STATUS_WEIGHT[item.task.status] +
      (item.signals.isStale ? 50 : 0)
    );
  }

  private matchesDueFilter(item: NextTaskItem, due: DueFilter) {
    if (due === DueFilter.ANY) {
      return true;
    }

    if (due === DueFilter.OVERDUE) {
      return item.signals.isOverdue;
    }

    if (due === DueFilter.TODAY) {
      return item.signals.isDueToday;
    }

    if (due === DueFilter.WEEK) {
      return item.signals.isDueThisWeek;
    }

    return item.task.dueAt === null;
  }

  private compareNextTaskItems(
    a: NextTaskItem,
    b: NextTaskItem,
    sort = NextTasksSort.RECOMMENDED,
  ) {
    if (sort === NextTasksSort.PRIORITY) {
      return (
        PRIORITY_WEIGHT[b.task.priority] - PRIORITY_WEIGHT[a.task.priority] ||
        a.task.order - b.task.order
      );
    }

    if (sort === NextTasksSort.ORDER) {
      return a.task.order - b.task.order;
    }

    if (sort === NextTasksSort.UPDATED_AT) {
      return b.task.updatedAt.getTime() - a.task.updatedAt.getTime();
    }

    if (sort === NextTasksSort.DUE_AT) {
      return this.compareNullableDates(a.task.dueAt, b.task.dueAt);
    }

    if (sort === NextTasksSort.STALE) {
      return Number(b.signals.isStale) - Number(a.signals.isStale);
    }

    return (
      b.recommendationScore - a.recommendationScore ||
      a.task.order - b.task.order ||
      b.task.updatedAt.getTime() - a.task.updatedAt.getTime()
    );
  }

  private compareNullableDates(a: Date | null, b: Date | null) {
    if (a && b) {
      return a.getTime() - b.getTime();
    }

    if (a) {
      return -1;
    }

    if (b) {
      return 1;
    }

    return 0;
  }
}
