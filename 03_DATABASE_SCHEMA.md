# SCRAPE WORLD

# 03_DATABASE_SCHEMA.md

Version: 1.0

Status: Core Architecture

Database:

PostgreSQL

ORM:

Prisma

Architecture:

Multi-Tenant SaaS

---

# Database Philosophy

SCRAPE WORLD is not a lead table.

SCRAPE WORLD is an intelligence platform.

Everything revolves around:

```text
Organization
    └── Business
            ├── Website
            ├── Social Profiles
            ├── Competitors
            ├── AI Reports
            ├── CRM Data
            ├── Activities
            └── Opportunities
```

---

# Core Entity Relationship

```text
Organization
│
├── Users
├── Searches
├── Businesses
├── Deals
├── Tasks
├── Activities
└── Reports
```

---

# ORGANIZATION

Represents a company account.

Table:

organization

Fields:

id

name

slug

logo_url

website

plan

credits_remaining

created_at

updated_at

---

# USER

Table:

user

Fields:

id

organization_id

name

email

avatar

role

is_active

last_login

created_at

updated_at

---

# Roles

OWNER

ADMIN

SALES

VIEWER

---

# BUSINESS

Central entity.

Every discovered company becomes a business.

Table:

business

Fields:

id

organization_id

name

slug

industry

description

website

email

phone

rating

review_count

status

city

state

country

address

latitude

longitude

google_place_id

created_at

updated_at

---

# Business Status

NEW

QUALIFIED

CONTACTED

INTERESTED

CUSTOMER

ARCHIVED

---

# WEBSITE

Stores website intelligence.

Table:

website

Fields:

id

business_id

url

domain

technology_stack

hosting_provider

cms

ssl_enabled

security_score

performance_score

seo_score

accessibility_score

best_practices_score

overall_score

last_scan_at

created_at

updated_at

---

# WEBSITE ISSUES

Stores website problems.

Table:

website_issue

Fields:

id

website_id

type

severity

title

description

recommendation

created_at

---

# Severity

LOW

MEDIUM

HIGH

CRITICAL

---

# SOCIAL PROFILE

Stores social presence.

Table:

social_profile

Fields:

id

business_id

platform

url

username

followers

following

posts

is_active

last_post_date

engagement_score

created_at

updated_at

---

# Platforms

INSTAGRAM

LINKEDIN

FACEBOOK

TWITTER

YOUTUBE

TIKTOK

---

# BUSINESS CONTACT

Stores multiple contacts.

Table:

business_contact

Fields:

id

business_id

name

email

phone

position

linkedin_url

is_primary

created_at

updated_at

---

# COMPETITOR

Stores competitor businesses.

Table:

competitor

Fields:

id

business_id

competitor_business_id

relationship_score

created_at

---

# COMPETITOR ANALYSIS

Table:

competitor_analysis

Fields:

id

business_id

competitor_id

website_score_gap

seo_gap

social_gap

review_gap

brand_gap

summary

created_at

---

# AI REPORT

Stores AI-generated intelligence.

Table:

ai_report

Fields:

id

business_id

report_type

summary

opportunities

problems

recommendations

sales_angles

confidence_score

generated_at

---

# Report Types

PROFILE

WEBSITE

COMPETITOR

OUTREACH

FULL_ANALYSIS

---

# OPPORTUNITY

Revenue opportunity.

Table:

opportunity

Fields:

id

business_id

title

description

service_type

priority

estimated_value

opportunity_score

status

created_at

updated_at

---

# Opportunity Status

OPEN

ACTIVE

CLOSED

LOST

---

# Service Types

WEBSITE

SEO

AUTOMATION

MARKETING

AI

SOFTWARE

BRANDING

---

# SEARCH JOB

Tracks searches.

Table:

search_job

Fields:

id

organization_id

keyword

location

platform

status

total_found

total_processed

started_at

completed_at

created_at

---

# Search Platforms

GOOGLE_MAPS

INSTAGRAM

LINKEDIN

FACEBOOK

CUSTOM

---

# SCRAPE RESULT

Raw storage.

Table:

scrape_result

Fields:

id

search_job_id

raw_data

processed

created_at

---

# CRM PIPELINE

Table:

pipeline

Fields:

id

organization_id

name

position

created_at

---

# Default Pipeline

NEW

QUALIFIED

CONTACTED

MEETING

PROPOSAL

NEGOTIATION

WON

LOST

---

# DEAL

Revenue tracking.

Table:

deal

Fields:

id

business_id

pipeline_id

title

value

probability

expected_close_date

owner_id

status

created_at

updated_at

---

# TASK

Follow-up system.

Table:

task

Fields:

id

business_id

assigned_to

title

description

priority

status

due_date

completed_at

created_at

updated_at

---

# Task Priority

LOW

MEDIUM

HIGH

URGENT

---

# Task Status

TODO

IN_PROGRESS

DONE

CANCELLED

---

# NOTE

Notes system.

Table:

note

Fields:

id

business_id

user_id

content

created_at

updated_at

---

# ACTIVITY

Universal activity log.

Table:

activity

Fields:

id

organization_id

user_id

business_id

type

metadata

created_at

---

# Activity Types

SEARCH_CREATED

BUSINESS_CREATED

REPORT_GENERATED

TASK_CREATED

TASK_COMPLETED

DEAL_CREATED

DEAL_UPDATED

EMAIL_SENT

CALL_MADE

NOTE_CREATED

---

# OUTREACH CAMPAIGN

Table:

campaign

Fields:

id

organization_id

name

type

status

created_at

updated_at

---

# Campaign Types

EMAIL

LINKEDIN

INSTAGRAM

SMS

MULTI_CHANNEL

---

# CAMPAIGN CONTACT

Table:

campaign_contact

Fields:

id

campaign_id

business_id

status

sent_at

opened_at

replied_at

created_at

---

# EMAIL TEMPLATE

Table:

email_template

Fields:

id

organization_id

name

subject

body

created_at

updated_at

---

# API KEY

Future integrations.

Table:

api_key

Fields:

id

organization_id

name

key_hash

last_used

created_at

---

# FILE STORAGE

Table:

file

Fields:

id

organization_id

business_id

name

url

size

type

created_at

---

# AUDIT LOG

Security and compliance.

Table:

audit_log

Fields:

id

organization_id

user_id

action

resource_type

resource_id

ip_address

created_at

---

# SUBSCRIPTION

Billing.

Table:

subscription

Fields:

id

organization_id

plan

status

credits

renewal_date

created_at

updated_at

---

# Dashboard Queries

Must be optimized for:

Lead Counts

Pipeline Counts

Opportunity Counts

Revenue

Task Counts

Recent Activity

---

# Required Indexes

business.organization_id

business.website

business.email

business.phone

deal.pipeline_id

deal.business_id

task.assigned_to

task.due_date

activity.organization_id

activity.created_at

search_job.organization_id

opportunity.business_id

ai_report.business_id

---

# Future Tables

visitor_tracking

website_heatmaps

cold_call_recordings

meeting_transcripts

proposal_generator

invoice

payment

voice_agent

ai_sdr

lead_scoring_history

---

# Scaling Goal

Database must support:

100,000+ Businesses

1,000,000+ Activities

100,000+ AI Reports

50,000+ Opportunities

10,000+ Deals

Without requiring schema redesign.

---

# Database Rule

Never store intelligence inside the business table.

Business table stores identity.

Intelligence belongs in separate tables.

This keeps the system scalable, maintainable, and extensible.

The database is the foundation of SCRAPE WORLD.
