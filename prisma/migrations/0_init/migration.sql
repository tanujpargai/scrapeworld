-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "BusinessStatus" AS ENUM ('NEW', 'QUALIFIED', 'CONTACTED', 'INTERESTED', 'CUSTOMER', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "SocialPlatform" AS ENUM ('INSTAGRAM', 'LINKEDIN', 'FACEBOOK', 'TWITTER', 'YOUTUBE', 'TIKTOK');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('PROFILE', 'WEBSITE', 'COMPETITOR', 'OUTREACH', 'FULL_ANALYSIS');

-- CreateEnum
CREATE TYPE "OpportunityStatus" AS ENUM ('OPEN', 'ACTIVE', 'CLOSED', 'LOST');

-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('WEBSITE', 'SEO', 'AUTOMATION', 'MARKETING', 'AI', 'SOFTWARE', 'BRANDING');

-- CreateEnum
CREATE TYPE "SearchPlatform" AS ENUM ('GOOGLE_MAPS', 'INSTAGRAM', 'LINKEDIN', 'FACEBOOK', 'CUSTOM');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('SEARCH_CREATED', 'BUSINESS_CREATED', 'REPORT_GENERATED', 'TASK_CREATED', 'TASK_COMPLETED', 'DEAL_CREATED', 'DEAL_UPDATED', 'EMAIL_SENT', 'CALL_MADE', 'NOTE_CREATED', 'AUDIT_COMPLETED', 'COMPETITOR_UPDATED', 'SCORE_CHANGED', 'OPPORTUNITY_GENERATED');

-- CreateTable
CREATE TABLE "business" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "industry" TEXT,
    "description" TEXT,
    "website" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "rating" DOUBLE PRECISION,
    "review_count" INTEGER,
    "status" "BusinessStatus" NOT NULL DEFAULT 'NEW',
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "google_place_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "website" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "technology_stack" JSONB NOT NULL,
    "hosting_provider" TEXT,
    "cms" TEXT,
    "ssl_enabled" BOOLEAN,
    "security_score" INTEGER,
    "performance_score" INTEGER,
    "seo_score" INTEGER,
    "accessibility_score" INTEGER,
    "best_practices_score" INTEGER,
    "overall_score" INTEGER,
    "last_scan_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "website_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "website_issue" (
    "id" TEXT NOT NULL,
    "website_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" "Severity" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "recommendation" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "website_issue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_profile" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "url" TEXT NOT NULL,
    "username" TEXT,
    "followers" INTEGER,
    "following" INTEGER,
    "posts" INTEGER,
    "is_active" BOOLEAN,
    "last_post_date" TIMESTAMP(3),
    "engagement_score" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_contact" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "position" TEXT,
    "linkedin_url" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competitor" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "competitor_business_id" TEXT NOT NULL,
    "relationship_score" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "competitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competitor_analysis" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "competitor_id" TEXT NOT NULL,
    "website_score_gap" INTEGER,
    "seo_gap" INTEGER,
    "social_gap" INTEGER,
    "review_gap" INTEGER,
    "brand_gap" INTEGER,
    "summary" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "competitor_analysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_report" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "report_type" "ReportType" NOT NULL,
    "summary" TEXT,
    "opportunities" JSONB,
    "problems" JSONB,
    "recommendations" JSONB,
    "sales_angles" JSONB,
    "confidence_score" DOUBLE PRECISION,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_intelligence" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "lead_score" INTEGER NOT NULL,
    "lead_tier" TEXT NOT NULL,
    "urgency_score" INTEGER NOT NULL,
    "buyer_probability" DOUBLE PRECISION NOT NULL,
    "reason_to_buy_score" INTEGER NOT NULL,
    "revenue_potential" DOUBLE PRECISION NOT NULL,
    "estimated_deal_value" DOUBLE PRECISION NOT NULL,
    "lead_summary" TEXT,
    "lead_priority_rank" INTEGER,
    "last_calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_intelligence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opportunity" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "service_type" "ServiceType" NOT NULL,
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "estimated_value" DOUBLE PRECISION,
    "opportunity_score" INTEGER,
    "status" "OpportunityStatus" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "opportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_job" (
    "id" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "radius" DOUBLE PRECISION,
    "platform" "SearchPlatform" NOT NULL DEFAULT 'GOOGLE_MAPS',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "total_found" INTEGER DEFAULT 0,
    "total_processed" INTEGER DEFAULT 0,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scrape_result" (
    "id" TEXT NOT NULL,
    "search_job_id" TEXT NOT NULL,
    "raw_data" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scrape_result_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pipeline" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pipeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deal" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "pipeline_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "value" DOUBLE PRECISION,
    "probability" DOUBLE PRECISION,
    "expected_close_date" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "due_date" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "note" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity" (
    "id" TEXT NOT NULL,
    "business_id" TEXT,
    "type" "ActivityType" NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "business_slug_key" ON "business"("slug");

-- CreateIndex
CREATE INDEX "business_website_idx" ON "business"("website");

-- CreateIndex
CREATE INDEX "business_email_idx" ON "business"("email");

-- CreateIndex
CREATE INDEX "business_phone_idx" ON "business"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "website_business_id_key" ON "website"("business_id");

-- CreateIndex
CREATE INDEX "ai_report_business_id_idx" ON "ai_report"("business_id");

-- CreateIndex
CREATE UNIQUE INDEX "lead_intelligence_business_id_key" ON "lead_intelligence"("business_id");

-- CreateIndex
CREATE INDEX "opportunity_business_id_idx" ON "opportunity"("business_id");

-- CreateIndex
CREATE INDEX "deal_pipeline_id_idx" ON "deal"("pipeline_id");

-- CreateIndex
CREATE INDEX "deal_business_id_idx" ON "deal"("business_id");

-- CreateIndex
CREATE INDEX "task_due_date_idx" ON "task"("due_date");

-- CreateIndex
CREATE INDEX "activity_created_at_idx" ON "activity"("created_at");

-- AddForeignKey
ALTER TABLE "website" ADD CONSTRAINT "website_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "website_issue" ADD CONSTRAINT "website_issue_website_id_fkey" FOREIGN KEY ("website_id") REFERENCES "website"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_profile" ADD CONSTRAINT "social_profile_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_contact" ADD CONSTRAINT "business_contact_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitor" ADD CONSTRAINT "competitor_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitor" ADD CONSTRAINT "competitor_competitor_business_id_fkey" FOREIGN KEY ("competitor_business_id") REFERENCES "business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitor_analysis" ADD CONSTRAINT "competitor_analysis_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitor_analysis" ADD CONSTRAINT "competitor_analysis_competitor_id_fkey" FOREIGN KEY ("competitor_id") REFERENCES "competitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_report" ADD CONSTRAINT "ai_report_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_intelligence" ADD CONSTRAINT "lead_intelligence_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunity" ADD CONSTRAINT "opportunity_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scrape_result" ADD CONSTRAINT "scrape_result_search_job_id_fkey" FOREIGN KEY ("search_job_id") REFERENCES "search_job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal" ADD CONSTRAINT "deal_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal" ADD CONSTRAINT "deal_pipeline_id_fkey" FOREIGN KEY ("pipeline_id") REFERENCES "pipeline"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task" ADD CONSTRAINT "task_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note" ADD CONSTRAINT "note_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity" ADD CONSTRAINT "activity_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
