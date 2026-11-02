# SCRAPE WORLD

# 06_CRM_SYSTEM.md

Version: 1.0

Status: Core Revenue Engine

---

# Overview

The CRM is the execution layer of SCRAPE WORLD.

Discovery finds businesses.

Intelligence finds opportunities.

CRM closes deals.

Without CRM, SCRAPE WORLD is a research tool.

With CRM, SCRAPE WORLD becomes a revenue platform.

---

# CRM Mission

Transform:

```text
Lead
```

Into:

```text
Client
```

Through a structured sales process.

---

# CRM Philosophy

The CRM should be:

Fast

Simple

Modern

Action-Oriented

Agency-Focused

---

Avoid:

Complex enterprise workflows

Excessive customization

Legacy CRM designs

Unnecessary fields

---

# Core CRM Components

Leads

Pipeline

Deals

Tasks

Activities

Notes

Meetings

Communications

Files

Reports

---

# CRM Architecture

```text
Lead
 │
 ▼
Pipeline
 │
 ▼
Deal
 │
 ▼
Activities
 │
 ▼
Won / Lost
```

---

# CRM Navigation

Route:

```text
/crm
```

Sub Routes:

```text
/crm/pipeline

/crm/deals

/crm/tasks

/crm/activities

/crm/reports
```

---

# Pipeline System

Purpose:

Visualize sales progress.

---

# Default Pipeline

Stage 1

NEW

---

Stage 2

QUALIFIED

---

Stage 3

CONTACTED

---

Stage 4

DISCOVERY_CALL

---

Stage 5

PROPOSAL_SENT

---

Stage 6

NEGOTIATION

---

Stage 7

WON

---

Stage 8

LOST

---

# Pipeline Board

Layout:

Kanban

Drag and Drop

Realtime Updates

---

# Pipeline Metrics

Lead Count

Deal Value

Average Age

Conversion Rate

---

# Pipeline Card

Displays:

Business Name

Opportunity Score

Deal Value

Contact Name

Last Activity

Next Task

Assigned User

Priority

---

# Lead Lifecycle

```text
Business Found
      │
      ▼
Lead Created
      │
      ▼
Qualified
      │
      ▼
Contacted
      │
      ▼
Meeting Scheduled
      │
      ▼
Proposal Sent
      │
      ▼
Negotiation
      │
      ▼
Won / Lost
```

---

# Lead Ownership

Each lead must have:

Owner

Team

Created By

Assigned Date

---

# Lead Assignment Methods

Manual

Auto Assignment

Round Robin

Territory Based

---

# Deal System

Purpose:

Track revenue opportunities.

---

# Deal Fields

ID

Title

Business

Owner

Value

Probability

Pipeline Stage

Expected Close Date

Status

Created Date

Updated Date

---

# Deal Value

Currency Supported

USD

EUR

GBP

INR

Custom

---

# Deal Probability

Range:

0-100

---

# Default Probability

NEW

10%

QUALIFIED

25%

CONTACTED

40%

DISCOVERY_CALL

55%

PROPOSAL_SENT

70%

NEGOTIATION

85%

WON

100%

LOST

0%

---

# Deal Forecasting

Calculate:

Expected Revenue

Weighted Revenue

Monthly Forecast

Quarterly Forecast

Annual Forecast

---

# Activities

Purpose:

Track every interaction.

---

# Activity Types

Email Sent

Email Opened

Email Replied

Call Made

Meeting Scheduled

Meeting Completed

Task Created

Task Completed

Note Added

Proposal Sent

Deal Won

Deal Lost

---

# Activity Timeline

Every lead must display:

Chronological Timeline

Newest First

---

# Example Timeline

```text
Proposal Sent

↓

Meeting Completed

↓

Follow-Up Call

↓

Initial Outreach

↓

Lead Created
```

---

# Task System

Purpose:

Prevent leads from being forgotten.

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

# Task Priorities

LOW

MEDIUM

HIGH

URGENT

---

# Task Status

TODO

IN_PROGRESS

COMPLETED

CANCELLED

---

# Task Reminders

Email

In-App Notification

Push Notification

---

# Smart Tasks

AI can generate tasks automatically.

Example:

```text
Lead replied to email.

Create follow-up task.
```

---

# Notes System

Purpose:

Store sales intelligence.

---

# Note Types

General

Meeting Notes

Call Notes

Strategy Notes

AI Notes

---

# Rich Text Support

Bold

Lists

Links

Mentions

Attachments

---

# Communication Center

Purpose:

Central communication history.

---

# Communication Types

Email

LinkedIn

Instagram

Phone

WhatsApp

Manual Entry

---

# Email Tracking

Track:

Sent

Delivered

Opened

Clicked

Replied

Bounced

---

# Meeting Management

Purpose:

Track sales meetings.

---

# Meeting Fields

Title

Lead

Date

Duration

Attendees

Notes

Recording URL

Outcome

---

# Meeting Outcomes

Interested

Need Proposal

Follow-Up Required

Not Interested

Closed Won

Closed Lost

---

# Proposal Tracking

Purpose:

Monitor proposal status.

---

# Proposal Status

Draft

Sent

Viewed

Accepted

Rejected

Expired

---

# File Management

Store:

Proposals

Contracts

Invoices

Screenshots

Attachments

Reports

---

# CRM Search

Search Across:

Businesses

Deals

Tasks

Activities

Contacts

Notes

Files

---

# Filters

Owner

Pipeline Stage

Industry

Location

Priority

Opportunity Score

Revenue Range

Created Date

---

# CRM Reports

Purpose:

Track sales performance.

---

# Report Types

Pipeline Report

Deal Report

Revenue Report

Activity Report

User Performance

Conversion Report

---

# Key Metrics

Total Leads

Qualified Leads

Meetings Booked

Proposals Sent

Deals Won

Revenue Generated

Conversion Rate

Average Deal Size

---

# Dashboard Widgets

Pipeline Value

Forecast Revenue

Tasks Due

Recent Activities

Top Opportunities

Deal Velocity

---

# Lead Health Score

Range:

0-100

---

# Factors

Last Contact Date

Task Completion

Response Rate

Deal Progress

Activity Frequency

---

# Lead Risk Detection

AI should identify:

Inactive Lead

Stalled Deal

Missed Follow-Up

No Recent Activity

Low Engagement

---

# CRM Automation

Automatic Task Creation

Automatic Reminders

Stage Change Triggers

Lead Assignment

Pipeline Updates

Activity Logging

---

# Automation Examples

```text
Proposal Sent
     │
     ▼
Create Follow-Up Task
     │
     ▼
Due In 3 Days
```

---

```text
Deal Moved To WON
      │
      ▼
Create Client Onboarding Task
```

---

# Permissions

Owner

Full Access

---

Admin

Manage CRM

---

Sales

Assigned Records

---

Viewer

Read Only

---

# Future CRM Features

Multi-Pipeline Support

Client Portal

Contract Management

Invoice Management

Payment Tracking

AI Meeting Summaries

Voice Notes

Conversation Intelligence

Revenue Attribution

---

# CRM Success Metric

A user should be able to answer:

What leads need attention?

What deals are most valuable?

What should I do next?

How much revenue is likely to close?

Without opening any other tool.

---

# Golden Rule

Every screen inside the CRM must help the user take action.

The CRM exists to move businesses through the pipeline and convert opportunities into revenue.

Everything else is secondary.

