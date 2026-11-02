-- AlterTable
ALTER TABLE "lead_intelligence" ADD COLUMN     "closing_probability" INTEGER,
ADD COLUMN     "contactability_tier" TEXT,
ADD COLUMN     "reachability_score" INTEGER,
ADD COLUMN     "sales_readiness_tier" TEXT;

-- AlterTable
ALTER TABLE "social_profile" ADD COLUMN     "activity_score" DOUBLE PRECISION,
ADD COLUMN     "followers_estimate" INTEGER,
ADD COLUMN     "last_seen_date" TIMESTAMP(3);
