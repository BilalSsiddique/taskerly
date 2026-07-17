# Taskerly

Taskerly is a standalone task and plan tracker for personal engineering work across multiple repositories. It is designed to answer one practical question quickly:

> What should I work on next, what was the plan, and where exactly did I stop?

The backend is built with **NestJS**, **Prisma**, and **PostgreSQL**. The planned frontend is **Next.js**. Taskerly has its own database.

## Why It Exists

Engineering work often gets scattered across repo issues, scratch notes, PR descriptions, integration docs, and memory. That makes it expensive to restart a task after a context switch.

Taskerly keeps the operational pieces together:

- Cross-repo tasks ranked by priority, status, and ordering.
- Durable implementation plans with stable identity keys.
- Version history for every plan edit.
- Lightweight technical docs tied to the exact plan version they support.
- Last-context breadcrumbs for resuming stale work without rereading everything.
- External references to DevCurate, GitHub, Notion, PRs, issues, or any other useful link.

## Core Concepts

| Concept          | Purpose                                                                                                                                                   |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Repo`           | A named bucket for work, such as `mappetizer-backend` or `devcurate-api`.                                                                                 |
| `Task`           | A unit of pending or active work inside a repo. Tasks have status, priority, order, due dates, and a `lastContext` note.                                  |
| `Plan`           | The current or historical implementation approach for a task. Usually one task has one active plan. A second plan means a real restart, not a small edit. |
| `PlanVersion`    | Append-only plan history. Every meaningful edit creates a new version with a short change summary.                                                        |
| `Doc`            | A self-contained technical document, such as an FE integration guide, architecture note, or API spec.                                                     |
| `DocVersion`     | Append-only document history.                                                                                                                             |
| `PlanVersionDoc` | Links a plan version to supporting docs, optionally pinning the exact doc version that matched that plan.                                                 |
| `TaskReference`  | A loose external pointer to anything useful, without creating a database dependency on another system.                                                    |

## Product Flow

1. Create a repo if it does not already exist.
2. Add a task with title, priority, and `BACKLOG` status.
3. Paste an implementation plan.
4. Taskerly creates a `Plan`, generates a stable identity key, and stores `PlanVersion` v1.
5. Move the task into `IN_PROGRESS` and drag it into the right order.
6. Write or attach supporting docs, such as an FE integration note.
7. Link docs to the current plan version and pin the matching doc version.
8. When the plan changes, create a new `PlanVersion` with a change summary.
9. Before switching away, update `lastContext`.
10. When reopening the task later, use `lastContext`, the current plan version, and linked docs to recover the full state quickly.


## Taskerly Frontend Views

#### DASHBOARD VIEW

![DASHBAORD](Taskerly-dashboard-view.png)

#### TASKERLY WORKBENCH VIEW

![WORKBENCH](Taskerly.png)


#### TASKERLY PLAN VIEW

![WORKBENCH](Taskerly-plan-view.png)


#### TASKERLY DOC VIEW

![WORKBENCH](Taskerly-workbench-doc-view.png)



## Architecture

```mermaid
flowchart LR
    Browser["Next.js frontend"] --> API["NestJS API"]
    API --> Auth["Better Auth"]
    API --> Prisma["Prisma Client"]
    Prisma --> Postgres[("PostgreSQL")]
    Auth --> Postgres
```

## Entity Relationship Diagram

```mermaid
erDiagram
    User ||--o{ Project : owns
    User ||--o{ Repo : owns
    User ||--o{ Task : owns
    User ||--o{ Doc : owns
    Project ||--o{ Repo : contains
    Repo ||--o{ Task : contains
    Task ||--o{ Plan : has
    Task ||--o{ TaskReference : references
    Task ||--o{ Doc : drafts
    Plan ||--o{ PlanVersion : iterates_as
    PlanVersion ||--o{ PlanVersionDoc : links
    PlanVersionDoc }o--|| Doc : points_to
    PlanVersionDoc }o--o| DocVersion : pins_snapshot
    Doc ||--o{ DocVersion : has_history

    Project {
        uuid id
        string userId
        string name
        string slug
        enum category
        float order
        datetime deletedAt
    }

    Repo {
        uuid id
        string userId
        uuid projectId
        string name
        string slug
        float order
        datetime deletedAt
    }

    Task {
        uuid id
        string userId
        uuid repoId
        string title
        enum status
        enum priority
        float order
        text lastContext
        datetime lastContextUpdatedAt
        json metadata
        datetime dueAt
        datetime deletedAt
    }

    TaskReference {
        uuid id
        uuid taskId
        enum sourceType
        string label
        string url
    }

    Plan {
        uuid id
        uuid taskId
        string identityKey
        string title
        enum status
        datetime deletedAt
    }

    PlanVersion {
        uuid id
        uuid planId
        int versionNumber
        text content
        string changeSummary
        datetime createdAt
    }

    Doc {
        uuid id
        string userId
        uuid taskId
        string title
        enum docType
        datetime deletedAt
    }

    DocVersion {
        uuid id
        uuid docId
        int versionNumber
        text content
        string changeSummary
    }

    PlanVersionDoc {
        uuid id
        uuid planVersionId
        uuid docId
        uuid docVersionId
        enum role
    }

```

## Task Lifecycle

```mermaid
stateDiagram-v2
    [*] --> BACKLOG
    BACKLOG --> PLANNED
    PLANNED --> IN_PROGRESS
    IN_PROGRESS --> BLOCKED
    BLOCKED --> IN_PROGRESS
    IN_PROGRESS --> DONE
    PLANNED --> ABANDONED
    IN_PROGRESS --> ABANDONED
    BLOCKED --> ABANDONED
    DONE --> [*]
    ABANDONED --> [*]
```

## Plan And Doc Versioning

```mermaid
sequenceDiagram
    participant You
    participant Task
    participant Plan
    participant PlanVersion
    participant Doc as Doc

    You->>Task: Create task in repo
    You->>Plan: Paste initial plan
    Plan->>PlanVersion: Create v1 with identity key
    You->>Doc: Write FE integration doc
    You->>PlanVersion: Link doc as FE_INTEGRATION and pin DocVersion v1
    Note over You,PlanVersion: Plan changes
    You->>PlanVersion: Create v2 with change summary
    PlanVersion-->>PlanVersion: Carry doc links forward
    You->>Doc: Update doc for new approach
    You->>PlanVersion: Re-pin DocVersion v2 on current plan version
```

## Data Model Decisions

- Soft deletes on `Repo`, `Task`, `Plan`, and `Doc` preserve history while keeping normal views clean.
- Float `order` fields support drag-and-drop insertion between siblings without rewriting every row.
- `Plan.identityKey` is unique and stable so external docs and PRs can link back to a precise plan.
- `PlanVersion` and `DocVersion` are append-only history tables.
- Current plan and doc versions are derived from the highest `versionNumber`, avoiding a mutable `isCurrent` flag.
- `Doc.userId` and optional `Doc.taskId` are enforced with real Prisma relations.
- `Task.metadata` provides a small JSON extension point for labels, external IDs, and future fields.
- Query-shaped indexes support common views such as tasks by repo order, user status, due date, and soft-delete state.
- `TaskReference` intentionally avoids foreign keys to external systems.
- Auth tables mirror the existing DevCurate provider pattern.

## Current Backend Stack

- NestJS 11
- Prisma 7
- PostgreSQL 15 through Docker Compose
- Better Auth
- Swagger in non-production environments
- Global validation through Nest `ValidationPipe`

## Local Development

### Prerequisites

- Node.js
- Yarn
- Docker

### Environment

Copy `.env.example` to `.env` and fill in the local values:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5431/taskerly_db"
BETTER_AUTH_SECRET="replace-with-a-local-secret"
BETTER_AUTH_URL="http://localhost:3002"
FRONTEND_URL="http://localhost:3000"
CORS_ORIGIN="http://localhost:3000"
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
PORT=3002
```

### Install Dependencies

```bash
yarn install
```

### Start Postgres

```bash
docker compose up -d
```

### Run Migrations

```bash
yarn prisma migrate dev
```

If your Yarn setup does not expose Prisma directly, use:

```bash
yarn exec prisma migrate dev
```

### Start The API

```bash
yarn start:dev
```

The API runs at:

- API: `http://localhost:3002/api`
- Swagger: `http://localhost:3002/docs`

## Scripts

| Command          | Description                         |
| ---------------- | ----------------------------------- |
| `yarn start:dev` | Start the NestJS API in watch mode. |
| `yarn build`     | Compile the backend.                |
| `yarn test`      | Run unit tests.                     |
| `yarn test:e2e`  | Run e2e tests.                      |
| `yarn test:cov`  | Run test coverage.                  |
| `yarn lint`      | Run ESLint with fixes.              |
| `yarn format`    | Format source and test files.       |

## Roadmap

### Foundation

- Build CRUD APIs for repos, tasks, plans, plan versions, docs, doc versions, and references.
- Add DTOs, validation, auth guards, and ownership checks.
- Add service-level tests for versioning and authorization boundaries.
- Generate OpenAPI documentation from the NestJS controllers.

### Productivity Views

- Cross-repo "what should I work on now" view.
- Staleness indicators based on last activity and `lastContext`.
- Due-soon and overdue task filters.
- Pinned repos and tasks.
- Full-text search across plan and doc versions.

