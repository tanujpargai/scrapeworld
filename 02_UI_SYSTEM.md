# scrapeworld 

# 02_UI_SYSTEM.md

Version: 1.0

Status: Active

---

# Design Philosophy

scrapeworld is not a traditional CRM.

scrapeworld is a premium intelligence platform.

The interface must feel:

* Fast
* Modern
* Technical
* Premium
* Trustworthy
* Data-Dense

Users should feel like they are operating an intelligence system, not filling out spreadsheets.

---

# Design Inspiration

Primary Inspiration:

* Linear
* Vercel
* Stripe Dashboard
* Arc Browser
* Notion
* Attio CRM
* Clay
* Retool

Avoid:

* HubSpot-style clutter
* Salesforce complexity
* Bright startup colors
* Excessive animations

---

# Visual Identity

Keywords:

Precision

Intelligence

Control

Speed

Clarity

Authority

---

# Color System

## Primary

```css
#6366F1
```

Used for:

* Primary Buttons
* Links
* Active States
* Highlights

---

## Secondary

```css
#8B5CF6
```

Used for:

* Secondary Actions
* AI Components
* Opportunity Scores

---

## Success

```css
#10B981
```

Used for:

* Success States
* Positive Metrics
* Won Deals

---

## Warning

```css
#F59E0B
```

Used for:

* Medium Priority
* Warnings

---

## Danger

```css
#EF4444
```

Used for:

* Critical Issues
* Lost Deals
* Delete Actions

---

# Background Colors

Main Background

```css
#0B1220
```

Surface

```css
#111827
```

Card

```css
#161F2F
```

Hover

```css
#1C2638
```

Border

```css
#243042
```

---

# Typography

Font Family

```text
Inter
```

Fallback

```text
system-ui
```

---

# Font Scale

Display

```text
48px
```

Page Title

```text
32px
```

Section Title

```text
24px
```

Card Title

```text
18px
```

Body

```text
14px
```

Caption

```text
12px
```

---

# Font Weights

Regular

400

Medium

500

SemiBold

600

Bold

700

ExtraBold

800

---

# Spacing System

```text
4px
8px
12px
16px
20px
24px
32px
40px
48px
64px
```

All layouts must use this spacing scale.

---

# Border Radius

Small

```text
8px
```

Medium

```text
12px
```

Large

```text
16px
```

Extra Large

```text
24px
```

---

# Shadows

Small

```css
0 1px 2px rgba(0,0,0,.15)
```

Medium

```css
0 8px 24px rgba(0,0,0,.25)
```

Large

```css
0 16px 48px rgba(0,0,0,.35)
```

---

# Application Layout

```text
+--------------------------------+
| Header                         |
+------+-------------------------+
| Side | Main Content            |
| Bar  |                         |
|      |                         |
+------+-------------------------+
```

---

# Sidebar

Width

```text
280px
```

Collapsed

```text
80px
```

---

# Sidebar Items

Dashboard

Discovery

Leads

Opportunities

CRM

Outreach

Reports

Settings

---

# Sidebar States

Default

Hover

Active

Disabled

Collapsed

---

# Active Navigation

Background

```css
rgba(99,102,241,.15)
```

Border Left

```css
#6366F1
```

---

# Header

Height

```text
72px
```

Contains:

Search

Notifications

Tasks

Profile

Organization

Theme Toggle

---

# Global Search

Always visible.

Searches:

Businesses

Leads

Tasks

Deals

Activities

Reports

---

# Buttons

## Primary

Background

```css
#6366F1
```

Text

White

Hover

```css
#5458EE
```

---

## Secondary

Transparent

Border

```css
#243042
```

---

## Danger

Red Background

White Text

---

## Ghost

Transparent

No Border

---

# Button Sizes

Small

```text
36px
```

Medium

```text
44px
```

Large

```text
52px
```

---

# Cards

All cards must have:

Background

Border

Subtle Shadow

Hover State

---

# KPI Cards

Display:

Metric

Trend

Percentage Change

Mini Chart

---

# KPI Layout

```text
+------------------+
| Metric           |
| Value            |
| Trend            |
+------------------+
```

---

# Dashboard Layout

Row 1

8 KPI Cards

---

Row 2

Lead Activity Chart

Opportunity Chart

---

Row 3

Recent Activity

Top Opportunities

---

# Tables

Must use:

TanStack Table

Features:

Sorting

Filtering

Pagination

Bulk Actions

Column Visibility

Search

---

# Table Header

Sticky

---

# Table Row Hover

Background:

```css
#1C2638
```

---

# Empty States

Every page requires:

Illustration

Message

Action Button

Example:

"No leads found"

Button:

Start Discovery

---

# Loading States

Use Skeleton Components.

Never use spinners alone.

---

# Skeleton Types

Card Skeleton

Table Skeleton

Profile Skeleton

Dashboard Skeleton

---

# Lead Profile Layout

```text
+-------------------------------+
| Lead Header                   |
+-------------------------------+
| Tabs                          |
+-------------------------------+
| Content                       |
+-------------------------------+
```

---

# Lead Header

Contains:

Business Name

Industry

Status

Opportunity Score

Assigned User

Actions

---

# Header Actions

Run Audit

Generate AI Report

Move To CRM

Export

Delete

---

# Score Badges

Green

80-100

Yellow

50-79

Red

0-49

---

# Opportunity Score Widget

Circular Progress

0-100

Color Based

---

# Website Audit Cards

Performance

SEO

Accessibility

Security

Technology

---

# Competitor Comparison

Layout

```text
Lead vs Competitors
```

Comparison Table

Visual Charts

Gap Analysis

---

# CRM Pipeline

Kanban Board

Drag and Drop

Real-Time Updates

---

# Lead Card

Contains:

Business Name

Opportunity Score

Value

Last Activity

Next Task

---

# Opportunity Center

Grid Layout

Card Based

Each card shows:

Business

Opportunity Score

Problems

Recommended Service

Value Estimate

---

# AI Components

Special Purple Accent

Used only for:

AI Reports

Recommendations

Insights

Predictions

---

# AI Insight Box

Contains:

Insight

Reason

Confidence Score

Suggested Action

---

# Notification System

Top Right

Bell Icon

Dropdown Panel

---

# Notification Types

Success

Warning

Error

Information

---

# Modal System

Sizes

Small

Medium

Large

Full Screen

---

# Common Modals

Create Lead

Delete Lead

Run Audit

Generate Report

Create Task

Assign User

---

# Responsive Design

Desktop

1440+

---

Laptop

1024+

---

Tablet

768+

---

Mobile

375+

---

# Mobile Sidebar

Drawer Layout

Slide From Left

---

# Mobile Tables

Convert To Cards

---

# Dark Mode

Default Theme

Primary Experience

---

# Light Mode

Optional

Secondary Experience

---

# Animations

Duration

150ms

200ms

300ms

Maximum

---

# Animation Rules

Subtle Only

No Bouncing

No Flashing

No Over-Animation

---

# Accessibility

WCAG AA Minimum

Keyboard Navigation

Screen Reader Labels

Focus States

Contrast Compliance

---

# UX Rules

Never hide critical actions.

Never require more than three clicks for common workflows.

Every important page must have:

Search

Filter

Sort

Export

Bulk Actions

---

# Design Goal

A user should feel:

"I have more intelligence about this lead than the lead has about themselves."

That feeling defines the Antigravity experience.
