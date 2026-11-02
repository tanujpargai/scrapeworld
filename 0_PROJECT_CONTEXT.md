# SCRAPE WORLD

# 00_PROJECT_CONTEXT.md

Status: Active

Read this file before making any code changes.

This file contains the current state of the project and overrides assumptions.

---

# Project Name

SCRAPE WORLD

---

# Project Type

Lead Intelligence Operating System

---

# Current Stage

MVP Development

---

# Primary Goal

Help agencies identify businesses that need services and provide enough intelligence to close them.

---

# Core Workflow

```text
Discover Business
        ↓
Enrich Business
        ↓
Audit Website
        ↓
Analyze Competitors
        ↓
Generate AI Intelligence
        ↓
Create Opportunities
        ↓
Generate Outreach
        ↓
Manage In CRM
        ↓
Close Client
```

---

# Product Vision

SCRAPE WORLD transforms raw business listings into qualified sales opportunities.

It combines:

* Lead Discovery
* Business Intelligence
* Website Audits
* Competitor Analysis
* AI Reports
* CRM
* Outreach

inside one platform.

---

# Current Priority

Build working features.

Not architecture discussions.

Not future enterprise features.

Not theoretical systems.

---

# MVP Scope

Included:

Google Maps Discovery

Business Profiles

Website Audits

Competitor Analysis

AI Reports

Opportunity Scoring

CRM

Tasks

Notes

Activity Tracking

Outreach Generation

---

# Excluded From MVP

Voice Agents

Proposal Builders

White Label

Marketplace

Advanced Permissions

Multi-Region Infrastructure

Enterprise Features

Custom Themes

Complex Integrations

---

# Technology Stack

Frontend

Next.js 15

TypeScript

TailwindCSS

Shadcn

TanStack Table

---

Backend

Next.js API Routes

TypeScript

Prisma

BullMQ

Redis

---

Database

PostgreSQL

---

AI

OpenAI

Claude

Gemini

Provider Agnostic

---

Storage

Cloudflare R2

or

Supabase Storage

---

# Design Philosophy

Premium SaaS

Dark Mode First

Minimal

Fast

Data Dense

Professional

---

# UI Inspiration

Linear

Clay

Attio

Vercel

Stripe

---

# Non-Goals

Do not make the UI playful.

Do not add unnecessary animations.

Do not add flashy gradients.

Do not add dashboard clutter.

---

# Database Philosophy

Business is the central entity.

Everything connects to a business.

---

# Main Entities

Business

Website

WebsiteIssue

SocialProfile

Competitor

AIReport

Opportunity

Deal

Task

Activity

Campaign

SearchJob

---

# Development Philosophy

Build.

Ship.

Iterate.

Avoid overengineering.

---

# Rules

Read:

12_AI_DEVELOPMENT_RULES.md

Before generating code.

These rules override preferences.

---

# Code Quality Requirements

TypeScript Strict Mode

No Any Types

Reusable Components

Repository Pattern

Service Layer

Zod Validation

BullMQ For Long Jobs

---

# Performance Requirements

Dashboard < 2 seconds

Business Profile < 1 second

AI Report Generation < 30 seconds

Audit < 60 seconds

---

# Folder Structure

```text
src/

app/

components/

services/

repositories/

lib/

workers/

queues/

validators/

types/

hooks/

```

---

# Business Objective

The platform exists to help agencies acquire clients.

Every feature should contribute to:

Finding opportunities

Improving outreach

Closing deals

---

# North Star Metric

Qualified Opportunities Generated

Not:

Businesses Scraped

Not:

Emails Sent

Not:

Reports Generated

---

# Current Build Order

1. Scraping Engine

2. Business Profiles

3. Website Intelligence

4. Competitor Intelligence

5. AI Reports

6. CRM

7. Outreach

8. Optimization

---

# AI Instruction

When asked to implement something:

Do not provide multiple approaches.

Do not write long explanations.

Choose the best implementation.

Write production-ready code.

Follow project architecture.

Reuse existing code whenever possible.

Prefer execution over discussion.

---

# Success Definition

A user can:

Search businesses

Analyze businesses

Identify opportunities

Generate outreach

Track follow-ups

Close clients

Without leaving SCRAPE WORLD.
