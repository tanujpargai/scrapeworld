-- AlterTable
ALTER TABLE "business" ADD COLUMN     "enterprise_flag" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "franchise_flag" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "outreach_suitability_score" INTEGER,
ADD COLUMN     "owner_confidence" DOUBLE PRECISION,
ADD COLUMN     "owner_email" TEXT,
ADD COLUMN     "owner_linkedin" TEXT,
ADD COLUMN     "owner_name" TEXT,
ADD COLUMN     "owner_phone" TEXT,
ADD COLUMN     "owner_role" TEXT,
ADD COLUMN     "verification_date" TIMESTAMP(3),
ADD COLUMN     "verification_evidence" JSONB,
ADD COLUMN     "verification_method" TEXT,
ADD COLUMN     "verified_website" TEXT,
ADD COLUMN     "website_confidence" DOUBLE PRECISION,
ADD COLUMN     "website_source" TEXT;

-- AlterTable
ALTER TABLE "lead_intelligence" ADD COLUMN     "sales_readiness_score" INTEGER;

-- AlterTable
ALTER TABLE "social_profile" ADD COLUMN     "confidence_score" DOUBLE PRECISION;
