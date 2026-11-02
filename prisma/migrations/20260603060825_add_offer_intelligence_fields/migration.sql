-- AlterTable
ALTER TABLE "lead_intelligence" ADD COLUMN     "contact_method_reason" TEXT,
ADD COLUMN     "first_touch_reason" TEXT,
ADD COLUMN     "first_touch_strategy" TEXT,
ADD COLUMN     "offer_confidence" INTEGER,
ADD COLUMN     "offer_reason" TEXT,
ADD COLUMN     "outreach_difficulty_level" TEXT,
ADD COLUMN     "outreach_difficulty_score" INTEGER,
ADD COLUMN     "preferred_contact_method" TEXT,
ADD COLUMN     "primary_offer" TEXT,
ADD COLUMN     "secondary_offer" TEXT;
