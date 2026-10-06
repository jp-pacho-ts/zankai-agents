<!-- AI_TEAM_UNINITIALIZED -->
# Architecture

Run `npm run zankai:init` after copying this template into a project. **Owner:** Architect (`TEAM-ARCH`, with Team Lead approval for major changes).

## Project Overview

Document the high-level system design, application purpose, and runtime environment here.

## Technology Stack

Default stack assumption: Next.js, TypeScript, React, shadcn/ui, Tailwind CSS, Prisma, PostgreSQL, and `npm`. Record actual stack boundaries as the project evolves.

## System Boundaries

- **Application & Domain Boundaries:** Define module organization (`src/app/**`, `src/components/**`, `src/server/**`, `prisma/**`).
- **Server / Client Boundaries:** Specify Next.js Server Components vs. Client Components, Server Actions, and Route Handlers.
- **Authentication & Authorization:** Document session strategy, role/permission checks, and enforcement layers.
- **Database & Data Access:** Document Prisma schema conventions, transaction rules, and query ownership.

## Shared Contracts (Required Before Parallel Work)

Before `TEAM-FE`, `TEAM-BE`, and `TEAM-DATA` execute in parallel on a multi-role feature, `TEAM-ARCH` establishes shared contracts here or in `.team/decisions/`:

- **API Shapes & Request/Response Types**
- **Domain Types & Shared Interfaces**
- **Prisma Entity Names & Enum Values**
- **Validation Rules (Zod schemas)**
- **Authentication & Authorization Rules**

## Architecture Decision Records (ADRs)

Record consequential decisions in `.team/decisions/ADR-NNN-*.md` using `.team/templates/ADR.md`. Accepted decisions require Team Lead approval when they involve `RED` or cross-cutting architectural changes.
