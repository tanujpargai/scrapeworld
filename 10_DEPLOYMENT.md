# SCRAPE WORLD

# 10_DEPLOYMENT.md

Version: 1.0

Status: Production Infrastructure

---

# Overview

This document defines how SCRAPE WORLD is deployed, monitored, scaled, and maintained.

The deployment architecture must support:

* SaaS multi-tenancy
* Large-scale scraping
* AI workloads
* Queue processing
* CRM operations
* Future growth

---

# Infrastructure Philosophy

Development should be simple.

Production should be scalable.

Workers should be isolated.

Databases should be protected.

Failures should be recoverable.

---

# Environments

Development

Staging

Production

---

# Development Environment

Purpose:

Local development.

---

Requirements

Node.js

PostgreSQL

Redis

Docker

Git

---

# Local Architecture

```text
Browser
   │
   ▼
Next.js
   │
   ▼
PostgreSQL

Redis
```

---

# Required Services

Frontend

Backend API

PostgreSQL

Redis

Queue Workers

---

# Docker Architecture

Services

```text
app

postgres

redis

search-worker

audit-worker

ai-worker

competitor-worker

notification-worker
```

---

# Docker Compose

Purpose:

Run complete stack locally.

---

# Local Ports

```text
3000  Next.js

5432  PostgreSQL

6379  Redis
```

---

# Environment Variables

Required

```env
DATABASE_URL=

REDIS_URL=

OPENAI_API_KEY=

ANTHROPIC_API_KEY=

GOOGLE_MAPS_API_KEY=

NEXTAUTH_SECRET=

NEXTAUTH_URL=

S3_BUCKET=

S3_REGION=

S3_ACCESS_KEY=

S3_SECRET_KEY=
```

---

# Production Architecture

```text
Users
   │
   ▼
CDN
   │
   ▼
Next.js Application
   │
   ├─────────────┐
   │             │
   ▼             ▼
PostgreSQL     Redis
   │             │
   └─────┬───────┘
         │
         ▼
Workers
         │
         ▼
AI Providers
```

---

# Frontend Hosting

Preferred

Vercel

---

Alternative

AWS ECS

Railway

Coolify

DigitalOcean

---

# Backend Hosting

Preferred

Dedicated Worker Services

---

Workers should not run inside frontend deployment.

---

# Database

Engine

PostgreSQL

---

Recommended Providers

Supabase

Neon

AWS RDS

---

Minimum Production Size

2 vCPU

4 GB RAM

---

# Redis

Purpose

Queues

Caching

Rate Limits

---

Recommended Providers

Upstash

Redis Cloud

AWS Elasticache

---

# File Storage

Purpose

Screenshots

Reports

Exports

Attachments

---

Recommended Providers

AWS S3

Cloudflare R2

Supabase Storage

---

# Worker Deployment

Separate Services

Search Worker

Audit Worker

AI Worker

Competitor Worker

Notification Worker

Export Worker

---

# Worker Isolation

Workers must scale independently.

---

Example

Heavy scraping traffic should not affect:

CRM

Dashboard

API

---

# Queue Infrastructure

Technology

BullMQ

---

Queues

Search Queue

Audit Queue

AI Queue

Competitor Queue

Notification Queue

Export Queue

---

# Scaling Strategy

Horizontal Scaling

---

Example

```text
1 API Server

10 Search Workers

4 AI Workers

2 Audit Workers
```

---

# API Rate Limiting

Purpose

Prevent abuse.

---

Limits

Anonymous

50/hour

---

Free Plan

500/day

---

Paid Plans

Plan Based

---

# Caching Strategy

Dashboard

5 Minutes

---

Lead Profile

15 Minutes

---

Reports

30 Minutes

---

Settings

60 Minutes

---

# Monitoring

Required

API Health

Worker Health

Queue Health

Database Health

AI Usage

Errors

Latency

---

# Monitoring Stack

Sentry

PostHog

OpenTelemetry

Grafana

---

# Error Tracking

Track

API Errors

Worker Failures

Database Errors

AI Failures

Provider Failures

---

# Logging

Store

Timestamp

User

Organization

Action

Response Time

Status

---

# Log Retention

30 Days

---

# Security

Requirements

HTTPS

Encrypted Storage

Role Permissions

Audit Logs

Rate Limiting

Input Validation

---

# Secrets Management

Never commit secrets.

---

Use

Environment Variables

Secret Managers

Encrypted Storage

---

# Authentication

Preferred

Clerk

---

Alternative

Auth.js

---

# Backups

Database

Daily

---

Files

Daily

---

Critical Data

Hourly Snapshots

---

# Backup Retention

7 Days

30 Days

90 Days

---

# Disaster Recovery

Objectives

Restore Database

Restore Files

Restore Queues

Restore Services

---

Recovery Time Target

Under 1 Hour

---

# CI/CD

Source Control

GitHub

---

Branch Strategy

main

develop

feature/*

---

Deployment Flow

```text
Feature Branch

↓

Pull Request

↓

Code Review

↓

Merge

↓

Deploy
```

---

# Automated Checks

TypeScript

Linting

Formatting

Unit Tests

Build Validation

---

# Database Migrations

Use Prisma Migrations

---

Rules

No manual production changes.

All changes must be versioned.

---

# Screenshots Service

Purpose

Website screenshots

Audit screenshots

Competitor screenshots

---

Storage

S3

R2

Supabase Storage

---

# Scheduled Jobs

Daily

Refresh Tasks

---

Weekly

Competitor Refresh

---

Monthly

Business Refresh

---

# AI Cost Controls

Track

Tokens

Requests

Cost

Provider

---

Limits

Organization Based

Plan Based

---

# Subscription Infrastructure

Plans

Free

Starter

Growth

Agency

Enterprise

---

Usage Tracking

Searches

Businesses

Reports

AI Credits

Storage

Users

---

# Analytics Infrastructure

Track

Signups

Retention

Feature Usage

Conversions

Revenue

---

# Multi-Region Strategy

Future

US

Europe

Asia

---

# Scaling Targets

V1

1,000 Organizations

100,000 Businesses

---

V2

10,000 Organizations

5,000,000 Businesses

---

V3

100,000 Organizations

100,000,000 Businesses

---

# Launch Infrastructure

Recommended Stack

Frontend

Next.js + Vercel

---

Database

Supabase PostgreSQL

---

Queue

Redis + BullMQ

---

Storage

Cloudflare R2

---

Auth

Clerk

---

Monitoring

Sentry + PostHog

---

This stack is sufficient for the first 100 paying customers.

---

# Golden Rule

The deployment architecture must ensure:

Scraping never blocks the API.

AI never blocks scraping.

CRM never blocks AI.

Workers handle heavy workloads.

The application remains responsive regardless of background processing.

SCRAPE WORLD should always feel fast, even when processing millions of records.

