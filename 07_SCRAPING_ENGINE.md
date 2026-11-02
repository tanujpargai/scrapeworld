# SCRAPE WORLD

# 07_SCRAPING_ENGINE.md

Version: 1.0

Status: Core Data Acquisition Layer

---

# Overview

The Scraping Engine is the data acquisition layer of SCRAPE WORLD.

Its responsibility is to discover, collect, enrich, validate, and normalize business information from public sources.

The scraping engine does not generate intelligence.

The scraping engine generates data.

Intelligence is generated later by the AI Engine.

---

# Mission

Convert:

```text
Search Query
```

Into:

```text
Verified Business Records
```

And then into:

```text
Enriched Business Profiles
```

---

# Core Principles

Data First

Accuracy Over Volume

Deduplication Required

Queue Driven

Provider Agnostic

Scalable

---

# Supported Data Sources

V1

Google Maps

Business Websites

Public Directories

---

V2

Instagram

LinkedIn

Facebook

YouTube

---

V3

Twitter/X

Crunchbase

Product Hunt

GitHub

Industry Directories

---

# Scraping Architecture

```text
User Search
     │
     ▼
Search Queue
     │
     ▼
Provider Scraper
     │
     ▼
Raw Results
     │
     ▼
Deduplication
     │
     ▼
Normalization
     │
     ▼
Business Creation
     │
     ▼
Enrichment Queue
```

---

# Search Workflow

User Inputs:

Keyword

Location

Radius

Limit

---

Example

```text
Dentists

Delhi

25km

500 results
```

---

System Actions

Create Search Job

Queue Search

Collect Results

Normalize Data

Store Businesses

Trigger Enrichment

---

# Search Job States

PENDING

RUNNING

PROCESSING

COMPLETED

FAILED

CANCELLED

---

# Search Job Metrics

Businesses Found

Businesses Processed

Businesses Saved

Duplicates Removed

Errors

Completion Time

---

# Google Maps Provider

Purpose:

Primary lead source.

---

Data Collected

Business Name

Address

Phone

Website

Category

Rating

Reviews

Opening Hours

Latitude

Longitude

Google Place ID

---

Search Strategy

Keyword Search

Category Search

Location Search

Radius Search

---

Example Queries

```text
Restaurants in Delhi

Dentists in London

Gyms in Mumbai
```

---

# Website Discovery

Purpose:

Find business website.

---

Methods

Google Maps Data

Search Engine Lookup

Directory References

Manual Entry

---

# Website Crawler

Purpose:

Collect website intelligence.

---

Pages To Crawl

Homepage

Contact Page

About Page

Services Page

Blog

Careers

---

# Website Data Extraction

Business Name

Emails

Phone Numbers

Forms

Social Links

Technology Stack

Analytics

Tracking Scripts

---

# Contact Extraction

Extract:

Emails

Phone Numbers

Contact Forms

Social Profiles

Addresses

---

# Contact Confidence

HIGH

Directly visible.

---

MEDIUM

Detected through patterns.

---

LOW

Inferred.

---

# Social Discovery

Purpose:

Locate business social accounts.

---

Platforms

Instagram

LinkedIn

Facebook

YouTube

---

Collected Data

Profile URL

Username

Followers

Posts

Engagement Signals

Last Activity

---

# LinkedIn Discovery

Purpose:

Business verification.

---

Collect

Company Name

Industry

Employee Count

Website

Headquarters

LinkedIn URL

---

# Instagram Discovery

Purpose:

Brand activity analysis.

---

Collect

Followers

Posts

Engagement

Bio

Link

Last Post Date

---

# Business Enrichment Pipeline

```text
Business Created
      │
      ▼
Website Discovery
      │
      ▼
Contact Discovery
      │
      ▼
Social Discovery
      │
      ▼
Technology Detection
      │
      ▼
AI Processing
```

---

# Technology Detection

Purpose:

Identify technology stack.

---

Detect

CMS

Framework

Analytics

Hosting

CDN

Payment Systems

Chat Widgets

Forms

---

# Example Output

```json
{
  "cms": "WordPress",
  "analytics": "Google Analytics",
  "hosting": "Cloudflare",
  "chat": "Tawk.to"
}
```

---

# Website Health Signals

SSL

Mobile Friendly

Load Speed

Tracking

Accessibility

SEO Structure

---

# Data Normalization

Purpose:

Standardize data.

---

Normalize

Phone Numbers

Domains

Addresses

Emails

Categories

Countries

States

Cities

---

# Example

Before

```text
+91 9876543210

9876543210

09876543210
```

After

```text
+919876543210
```

---

# Deduplication System

Purpose:

Prevent duplicate businesses.

---

Matching Factors

Google Place ID

Domain

Phone

Email

Business Name

Address

---

Duplicate Score

0-100

---

Rules

95+

Automatic Merge

---

80-94

Review Required

---

Below 80

New Record

---

# Data Validation

Validate

Emails

Phone Numbers

URLs

Domains

Coordinates

---

# Invalid Data Handling

Flag Record

Store Error

Continue Processing

Never stop pipeline.

---

# Error Categories

Provider Error

Network Error

Parsing Error

Validation Error

Unknown Error

---

# Proxy Layer

Purpose:

Prevent source blocking.

---

Requirements

Provider Rotation

Geo Rotation

Automatic Failover

Health Monitoring

---

# Proxy States

ACTIVE

COOLDOWN

FAILED

DISABLED

---

# Rate Limiting

Provider Specific.

---

Google Maps

Requests Per Minute

Configurable

---

Instagram

Provider Controlled

---

LinkedIn

Provider Controlled

---

# Retry Logic

Attempt 1

Immediate

---

Attempt 2

30 Seconds

---

Attempt 3

2 Minutes

---

Attempt 4

10 Minutes

---

Maximum

4 Retries

---

# Queue Architecture

Search Queue

Discovery Queue

Enrichment Queue

Validation Queue

Normalization Queue

---

# Queue Priority

HIGH

Manual Searches

---

MEDIUM

Scheduled Searches

---

LOW

Background Refreshes

---

# Refresh System

Purpose:

Keep data fresh.

---

Refresh Frequency

Business

30 Days

---

Website

7 Days

---

Social Profiles

14 Days

---

Competitors

30 Days

---

# Search Templates

Users can save searches.

---

Example

```text
Keyword:
Dentists

Location:
Delhi

Radius:
50km

Limit:
500
```

---

# Bulk Search

Allow

CSV Upload

Multi-Location Search

Industry Lists

---

# Export Formats

CSV

Excel

JSON

---

# Export Fields

Business

Website

Email

Phone

Scores

Social Profiles

AI Insights

---

# Search Analytics

Track

Search Volume

Businesses Found

Success Rate

Completion Time

Credits Used

---

# Scraping Metrics

Total Searches

Businesses Collected

Businesses Enriched

Duplicates Removed

Success Rate

Provider Health

---

# Future Data Sources

Google Business Profile Changes

Review Monitoring

Job Boards

Industry Associations

Government Registries

Maps Alternatives

Public Databases

---

# Golden Rule

The Scraping Engine exists to create accurate business records.

It should never generate opinions.

It should never generate recommendations.

Its responsibility ends when reliable, normalized, enriched business data has been stored.

Intelligence belongs to the AI Engine.

The Scraping Engine provides the fuel that powers SCRAPE WORLD.

