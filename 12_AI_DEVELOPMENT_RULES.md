# SCRAPE WORLD

# 12_AI_DEVELOPMENT_RULES.md

Version: 1.0

Priority: CRITICAL

These rules override all other instructions.

---

# PRIMARY OBJECTIVE

Build SCRAPE WORLD as fast as possible while maintaining production-quality code.

The AI exists to execute.

The AI does not exist to brainstorm endlessly.

The AI does not exist to generate unnecessary architecture.

The AI does not exist to create complexity.

---

# CORE RULE

When choosing between:

Simple Solution

and

Complex Solution

Choose the simpler solution.

---

# EXECUTION RULE

Do not explain.

Do not theorize.

Do not write essays.

Do not discuss possibilities.

Do not provide multiple options.

Choose the best implementation and build it.

---

# RESPONSE FORMAT

When asked to implement:

Provide:

1. Files to create
2. Files to modify
3. Code

Nothing else unless explicitly requested.

---

# TOKEN EFFICIENCY RULE

Minimize output.

Avoid:

Long explanations

Repeated summaries

Architecture discussions

Marketing language

Unnecessary comments

---

Bad:

```text id="o9r21j"
Here are 5 possible approaches...
```

Good:

```text id="twum7m"
Implementing Approach A.

Files:

...
```

---

# BUILD RULE

Prefer building.

Avoid planning.

If enough information exists:

Write code.

---

# FILE CREATION RULE

Do not create files unless required.

Every new file must have a purpose.

---

# DUPLICATION RULE

Never duplicate:

Components

Types

Schemas

Functions

Utilities

Services

---

# REFACTOR RULE

If functionality already exists:

Reuse it.

Extend it.

Do not rebuild it.

---

# COMPONENT RULES

Prefer:

Reusable Components

---

Avoid:

One-time Components

Unless complexity is reduced.

---

# COMPONENT SIZE

Target:

Under 300 lines.

---

If component exceeds:

500 lines

Refactor.

---

# PAGE RULES

Pages should:

Fetch data

Render UI

Nothing else.

Business logic belongs elsewhere.

---

# BUSINESS LOGIC RULE

Never place business logic in:

Pages

Components

Hooks

---

Place it inside:

Services

---

Example

Bad:

```typescript id="3twuvv"
DashboardPage.tsx
```

Contains:

Database Queries

AI Logic

Business Rules

---

Good:

```typescript id="z4p2v6"
DashboardService.ts
```

Contains:

Business Logic

---

# DATABASE RULES

All database access must go through repositories.

Never query Prisma directly inside components.

Never query Prisma directly inside pages.

---

# PRISMA RULES

One source of truth.

Never duplicate schema definitions.

Never create alternative models.

---

# API RULES

Keep APIs thin.

APIs should:

Validate

Authorize

Call Services

Return Results

---

Nothing else.

---

# SERVICE RULES

Services contain:

Business Logic

Workflow Logic

Decision Logic

---

Services do not contain:

UI Logic

---

# UI RULES

Use existing design system.

Never invent random styles.

Never invent random colors.

Use:

Tailwind

Shadcn

Existing Tokens

---

# DESIGN RULE

SCRAPE WORLD is:

Minimal

Professional

Data Dense

Fast

---

Not:

Playful

Colorful

Animated

Consumer-Oriented

---

# ANIMATION RULE

Minimal.

If animation is not necessary:

Remove it.

---

# DEPENDENCY RULE

Before installing a package:

Ask:

Can existing packages solve this?

If yes:

Do not install.

---

# PACKAGE RULE

Avoid dependency bloat.

Every dependency must justify its existence.

---

# PERFORMANCE RULE

Performance is a feature.

Prefer:

Server Components

Streaming

Caching

Pagination

Virtualization

---

Avoid:

Client-side data loading when unnecessary.

---

# QUERY RULE

Never fetch more data than required.

---

Bad:

```typescript id="vuk0io"
SELECT *
```

Good:

```typescript id="l8e48t"
Select required fields only
```

---

# TABLE RULE

All large tables must support:

Pagination

Sorting

Filtering

Search

---

# CACHE RULE

Cache expensive operations.

Examples:

AI Reports

Competitor Analysis

Website Audits

---

# AI RULE

Never generate AI reports synchronously.

Always use queues.

---

# QUEUE RULE

Long-running jobs must use BullMQ.

Examples:

Scraping

Auditing

AI Analysis

Exports

---

# ERROR HANDLING RULE

Never silently fail.

Always:

Log Error

Return Error

Track Error

---

# LOGGING RULE

Log:

Errors

Queue Failures

AI Failures

API Failures

---

Avoid excessive logging.

---

# SECURITY RULE

Validate all inputs.

Never trust frontend data.

---

Use:

Zod

---

# AUTH RULE

Every API route requires:

Authentication

Authorization

---

# TYPESCRIPT RULE

Strict Mode Required.

No:

```typescript id="d67dgl"
any
```

unless absolutely unavoidable.

---

# CODE STYLE RULE

Prefer:

Readable Code

Over:

Clever Code

---

# FUNCTION RULE

Functions should do one thing.

---

Bad:

1000-line function

---

Good:

Small focused functions

---

# NAMING RULE

Use descriptive names.

Bad:

```typescript id="5n8jvz"
data

item

temp
```

Good:

```typescript id="ucmfdm"
businessProfile

websiteAudit

opportunityScore
```

---

# TESTING RULE

Critical logic must be testable.

Especially:

Scoring

Competitor Analysis

Opportunity Generation

---

# SCRAPING RULE

Store raw data first.

Transform later.

Never lose source data.

---

# AI COST RULE

Always consider token cost.

Reuse cached outputs whenever possible.

---

# MIGRATION RULE

Never modify production schema manually.

Always use migrations.

---

# GIT RULE

Make focused commits.

Avoid massive unrelated changes.

---

# DECISION RULE

When uncertain:

Choose the solution that:

Uses fewer files

Uses fewer dependencies

Uses less code

Uses less complexity

Provides equal functionality

---

# FINAL RULE

SCRAPE WORLD is a lead acquisition platform.

The goal is:

Find Businesses

Analyze Businesses

Generate Opportunities

Close Clients

Everything that does not contribute to that goal is lower priority.

Build revenue-producing features first.

Ignore everything else.
