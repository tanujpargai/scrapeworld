# SCRAPE WORLD

# 04_BACKEND_ARCHITECTURE.md

Version: 1.0

Status: Core Engineering Specification

---

# Overview

SCRAPE WORLD is an AI-powered Lead Intelligence OS.

The backend must support:

* Large-scale lead discovery
* Multi-source enrichment
* Website auditing
* Competitor analysis
* CRM workflows
* AI-generated insights
* Background processing
* Multi-tenant organizations

The system must be designed for scale from Day 1.

---

# Core Principles

1. API First
2. Multi-Tenant
3. Queue Driven
4. Event Based
5. Horizontally Scalable
6. AI Ready

---

# Technology Stack

Framework

Next.js 15

---

Language

TypeScript

---

ORM

Prisma

---

Database

PostgreSQL

---

Queue

BullMQ

---

Cache

Redis

---

Storage

AWS S3

or

Supabase Storage

---

Authentication

Clerk

or

Auth.js

---

AI Layer

OpenAI

Anthropic

Google Gemini

Provider Agnostic

---

# High-Level Architecture

```text
Browser
    │
    ▼
Next.js App Router
    │
    ▼
API Layer
    │
 ┌──┼───────────────┐
 │  │               │
 ▼  ▼               ▼
DB Queue        AI Services
 │  │               │
 ▼  ▼               ▼
Postgres Redis External APIs
```

---

# Backend Folder Structure

```text
src/

├── app/
├── api/
├── lib/
├── services/
├── repositories/
├── queues/
├── workers/
├── ai/
├── audits/
├── scraping/
├── crm/
├── outreach/
├── auth/
├── middleware/
├── validators/
├── events/
├── types/
└── utils/
```

---

# App Layer

Purpose:

UI

Server Components

Client Components

Page Routing

---

# API Layer

Purpose:

Business Logic Entry Point

All frontend requests enter here.

---

# Service Layer

Purpose:

Business Logic

Example:

BusinessService

OpportunityService

AuditService

CRMService

AIService

---

# Repository Layer

Purpose:

Database Access

No Prisma calls outside repositories.

Example:

BusinessRepository

TaskRepository

DealRepository

AuditRepository

---

# Event System

Every major action emits an event.

Examples:

BusinessCreated

AuditCompleted

ReportGenerated

TaskCreated

DealWon

---

# Event Flow

```text
Business Created
        │
        ▼
BusinessCreated Event
        │
        ▼
Queue Jobs Triggered
```

---

# Multi-Tenant Architecture

Every record belongs to an organization.

Rule:

Every query must include:

organization_id

---

# Tenant Isolation

Required on:

Businesses

Tasks

Deals

Campaigns

Reports

Activities

Files

---

# API Design

Pattern:

```text
/api/v1/
```

---

# Business Routes

```text
GET    /businesses

GET    /businesses/:id

POST   /businesses

PATCH  /businesses/:id

DELETE /businesses/:id
```

---

# Audit Routes

```text
POST /audits/run

GET /audits/:id
```

---

# AI Routes

```text
POST /ai/generate-report

POST /ai/generate-outreach

POST /ai/generate-opportunity
```

---

# CRM Routes

```text
GET /deals

POST /deals

PATCH /deals/:id

DELETE /deals/:id
```

---

# Task Routes

```text
GET /tasks

POST /tasks

PATCH /tasks/:id

DELETE /tasks/:id
```

---

# Discovery Routes

```text
POST /search

GET /search/:id

GET /search/:id/results
```

---

# Queue Architecture

Never run heavy jobs inside API requests.

All long-running operations go to queues.

---

# Queues

Search Queue

Audit Queue

Enrichment Queue

Competitor Queue

AI Queue

Outreach Queue

Notification Queue

Export Queue

---

# Search Queue

Handles:

Google Maps

Instagram

LinkedIn

Facebook

Directory Searches

---

# Search Workflow

```text
Search Request
      │
      ▼
Search Queue
      │
      ▼
Raw Results
      │
      ▼
Business Creation
      │
      ▼
Enrichment Queue
```

---

# Enrichment Queue

Purpose:

Expand business data.

Tasks:

Website Discovery

Email Discovery

Social Discovery

Contact Discovery

Technology Detection

---

# Audit Queue

Purpose:

Website Intelligence

Tasks:

Lighthouse

SSL Checks

Security Headers

Performance Analysis

SEO Analysis

Accessibility Analysis

---

# Audit Pipeline

```text
Website
   │
   ▼
Audit Queue
   │
   ▼
Website Scores
   │
   ▼
Issue Detection
   │
   ▼
Opportunity Creation
```

---

# Competitor Queue

Purpose:

Market Intelligence

Tasks:

Find Competitors

Compare Scores

Compare Reviews

Compare Websites

Generate Gap Analysis

---

# AI Queue

Purpose:

Generate Intelligence

Tasks:

Business Summary

Opportunity Report

Sales Angles

Outreach Messages

Competitor Insights

---

# AI Pipeline

```text
Business
     │
     ▼
Website Data
     │
     ▼
Competitor Data
     │
     ▼
AI Engine
     │
     ▼
AI Report
```

---

# Worker Architecture

Workers are independent services.

```text
workers/

search.worker.ts

audit.worker.ts

competitor.worker.ts

ai.worker.ts

notification.worker.ts

export.worker.ts
```

---

# Redis Usage

Stores:

Queue Jobs

Rate Limits

Session Cache

Dashboard Cache

AI Cache

Temporary Search Results

---

# Cache Strategy

Dashboard

5 Minutes

---

Business Profiles

15 Minutes

---

Reports

30 Minutes

---

Settings

60 Minutes

---

# AI Service Layer

Purpose:

Single AI Interface

Never call providers directly.

Use:

AIService

---

# AI Service Functions

```typescript
generateReport()

generateOpportunity()

generateEmail()

generateCompetitorAnalysis()

generateSalesAngles()
```

---

# AI Provider Fallback

Priority:

OpenAI

↓

Claude

↓

Gemini

---

# File Storage

Store:

Audit Reports

Screenshots

Exports

Attachments

Logos

---

# Storage Structure

```text
organizations/

businesses/

audits/

exports/

uploads/
```

---

# Security Architecture

Authentication

Authorization

Rate Limiting

Input Validation

Audit Logging

Encryption

---

# Authentication Flow

```text
User Login
      │
      ▼
Session Created
      │
      ▼
Organization Loaded
      │
      ▼
Permissions Applied
```

---

# Authorization Rules

Owner

Full Access

---

Admin

Manage Organization

---

Sales

Assigned Records Only

---

Viewer

Read Only

---

# Validation Layer

Use:

Zod

Every API route must validate input.

---

# Logging System

Every request logs:

User

Route

Response Time

Status

Organization

---

# Error Handling

Standard Format

```json
{
  "success": false,
  "message": "Error Message",
  "code": "ERROR_CODE"
}
```

---

# Notifications

Trigger Events:

Task Due

Audit Complete

Deal Won

Lead Assigned

Report Generated

---

# Webhooks

Future Integrations

```text
Stripe

Slack

Discord

Zapier

Make

n8n
```

---

# Search Engine Integration Layer

Provider Abstraction

```typescript
GoogleMapsProvider

InstagramProvider

LinkedInProvider

FacebookProvider
```

Each provider must implement:

```typescript
search()

getBusiness()

enrich()
```

---

# Observability

Track:

API Latency

Queue Latency

Worker Failures

Database Performance

AI Usage

Credits Consumed

---

# Monitoring

Use:

Sentry

PostHog

OpenTelemetry

---

# Scalability Targets

Organizations

100,000+

Businesses

10,000,000+

Activities

100,000,000+

AI Reports

10,000,000+

Tasks

50,000,000+

---

# Backend Rule

The API must never perform intelligence work directly.

API creates jobs.

Workers perform jobs.

Database stores results.

Frontend displays results.

This separation is mandatory for SCRAPE WORLD scalability.
