# scrapeworld

# 01_PRODUCT_REQUIREMENTS.md

Version: 1.0

Status: Active

---

# Product Overview

scrapeworld is an AI-powered Lead Intelligence Operating System.

The platform helps agencies:

* Discover leads
* Analyze leads
* Understand competitors
* Generate sales opportunities
* Manage outreach
* Track revenue

Everything is centralized inside one application.

---

# Primary User

Agency Owner

Goals:

* Get clients
* Find opportunities
* Close deals faster

Pain Points:

* Bad lead quality
* Manual research
* No personalization
* CRM fragmentation

---

# Secondary Users

Sales Representatives

Lead Generation Teams

Business Development Teams

Freelancers

Consultants

---

# User Roles

## Owner

Permissions:

* Full access
* Billing
* Team Management
* Organization Settings

---

## Admin

Permissions:

* Lead Management
* CRM Access
* Team Access

Cannot:

* Delete Organization
* Manage Billing

---

## Sales Representative

Permissions:

* Assigned Leads
* CRM
* Outreach

Cannot:

* Billing
* Team Settings

---

## Viewer

Permissions:

* Read Only

Cannot:

* Modify Data

---

# Application Structure

```text
/
├── Dashboard
├── Discovery
├── Leads
├── Opportunities
├── CRM
├── Outreach
├── Reports
├── Settings
```

---

# Global Navigation

Left Sidebar

Items:

Dashboard

Discovery

Leads

Opportunities

CRM

Outreach

Reports

Settings

---

# Top Navigation

Contains:

Global Search

Notifications

Tasks

Profile Menu

Organization Switcher

Theme Switcher

---

# DASHBOARD

Route:

```text
/
```

Purpose:

Executive Overview

---

## Dashboard Components

### KPI Row

Cards:

Total Leads

Qualified Leads

Active Opportunities

Pipeline Value

Open Tasks

Response Rate

Conversion Rate

Revenue Generated

---

### Lead Activity Chart

Displays:

* New Leads
* Qualified Leads
* Won Deals

Time Range:

7 Days

30 Days

90 Days

1 Year

---

### Opportunity Overview

Displays:

Top opportunities.

Columns:

Business Name

Opportunity Score

Estimated Value

Assigned User

Status

---

### Recent Activity

Displays:

Lead Created

Lead Updated

Task Completed

Deal Won

Email Sent

Audit Completed

---

# DISCOVERY

Route

```text
/discovery
```

Purpose:

Find new businesses.

---

# Discovery Layout

Left Panel

Search Filters

Right Panel

Results

---

# Search Inputs

Keyword

Examples:

Dentists

Restaurants

Gyms

Law Firms

Real Estate

---

Location

Examples:

Delhi

Mumbai

London

New York

---

Radius

1km

5km

10km

25km

50km

100km

---

Lead Limit

10

50

100

500

1000

---

# Search Actions

Button:

Start Search

Button:

Save Search

Button:

Export Results

---

# Search Workflow

User enters:

Keyword

Location

Lead Limit

Clicks:

Start Search

System:

Creates Scrape Job

Job enters queue

Progress updates displayed

Results saved to database

User notified

---

# Discovery Results Table

Columns:

Business Name

Category

Rating

Reviews

Phone

Website

Email

Opportunity Score

Status

Actions

---

# Row Actions

View Profile

Add To CRM

Run Audit

Export

Delete

---

# LEADS

Route

```text
/leads
```

Purpose:

Master lead database.

---

# Lead Table

Columns:

Business Name

Industry

Website Score

SEO Score

Social Score

Opportunity Score

Status

Assigned User

Created Date

---

# Filters

Industry

Score

Location

Status

Assigned User

Website Present

Email Present

Phone Present

---

# Bulk Actions

Assign

Delete

Export

Audit

Move To CRM

Generate AI Reports

---

# Lead Profile

Route

```text
/leads/[id]
```

Purpose:

Single business intelligence page.

---

# Lead Profile Tabs

Overview

Website

Competitors

AI Insights

CRM

Activities

Notes

Files

---

# Overview Tab

Displays:

Business Name

Address

Phone

Email

Website

Social Links

Google Rating

Review Count

Industry

Business Age

---

# Website Tab

Displays:

Website Screenshot

Performance Score

SEO Score

Accessibility Score

Best Practices Score

Technology Stack

Security Findings

---

# Website Findings

Examples:

No SSL Redirect

Slow Homepage

No Contact Form

No Analytics

Missing Meta Tags

Broken Mobile Layout

---

# Competitor Tab

Displays:

Top Competitors

Comparison Metrics

Market Position

Gap Analysis

---

# AI Insights Tab

Displays:

Business Summary

Problems

Recommendations

Sales Angles

Suggested Services

Priority Level

Revenue Estimate

---

# CRM Tab

Displays:

Current Pipeline Stage

Assigned User

Tasks

Calls

Meetings

Deals

Emails

---

# OPPORTUNITIES

Route

```text
/opportunities
```

Purpose:

High-value sales opportunities.

---

# Opportunity Table

Columns:

Business

Opportunity Score

Estimated Value

Problems Found

Recommended Service

Priority

Owner

---

# Sorting

Highest Score

Highest Value

Newest

Most Active

---

# Opportunity Categories

Website Redesign

SEO

Automation

Marketing

Branding

Custom Software

AI Solutions

---

# CRM

Route

```text
/crm
```

Purpose:

Sales management.

---

# CRM Pipeline

Stages:

New

Qualified

Contacted

Meeting Scheduled

Proposal Sent

Negotiation

Won

Lost

---

# Pipeline View

Kanban Layout

Drag and Drop

Lead Cards

Stage Metrics

---

# Lead Card

Contains:

Business Name

Contact

Opportunity Score

Estimated Value

Next Task

Last Activity

---

# Tasks

Route

```text
/tasks
```

---

# Task Types

Call

Email

Meeting

Research

Proposal

Follow-Up

Custom

---

# Task Fields

Title

Description

Due Date

Priority

Lead

Assigned User

Status

---

# OUTREACH

Route

```text
/outreach
```

Purpose:

Sales execution.

---

# Outreach Types

Email

LinkedIn

Instagram

Phone

Custom

---

# Email Generator

Input:

Lead Data

Audit Data

Competitor Data

AI Analysis

Output:

Personalized Email

---

# AI Generated Content

Cold Email

Follow-up Email

LinkedIn Message

Instagram DM

Call Script

Meeting Preparation

---

# REPORTS

Route

```text
/reports
```

Purpose:

Performance analytics.

---

# Report Types

Lead Generation

Opportunity Performance

Sales Pipeline

Conversion Rates

Revenue

Team Activity

---

# SETTINGS

Route

```text
/settings
```

---

# Organization Settings

Name

Logo

Domain

Timezone

Currency

---

# Team Management

Invite User

Remove User

Change Role

Assign Leads

---

# Billing

Subscription Plan

Invoices

Usage

Credits

---

# Notifications

Email Notifications

Task Reminders

Audit Completion

Lead Assignment

Deal Updates

---

# Error Handling

All actions must:

Show loading state

Show progress state

Show success state

Show failure state

Provide retry option

---

# Performance Targets

Dashboard Load

< 2 seconds

Lead Search

< 10 seconds

Profile Load

< 1 second

Audit Completion

< 60 seconds

AI Report

< 30 seconds

---

# MVP Success Criteria

A user can:

1. Search businesses.
2. Save businesses.
3. Run audits.
4. Generate AI insights.
5. Compare competitors.
6. Manage leads.
7. Track follow-ups.
8. Close deals.

Without using any external software.
