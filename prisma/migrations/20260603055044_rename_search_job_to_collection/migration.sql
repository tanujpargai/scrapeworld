/*
  Warnings:

  - You are about to drop the column `search_job_id` on the `scrape_result` table. All the data in the column will be lost.
  - You are about to drop the `search_job` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `collection_id` to the `scrape_result` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "scrape_result" DROP CONSTRAINT "scrape_result_search_job_id_fkey";

-- AlterTable
ALTER TABLE "business" ADD COLUMN     "collection_id" TEXT;

-- AlterTable
ALTER TABLE "scrape_result" DROP COLUMN "search_job_id",
ADD COLUMN     "collection_id" TEXT NOT NULL;

-- DropTable
DROP TABLE "search_job";

-- CreateTable
CREATE TABLE "collection" (
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
    "target_count" INTEGER DEFAULT 100,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "locations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "current_keyword" TEXT,
    "current_location" TEXT,
    "businesses_failed" INTEGER DEFAULT 0,
    "businesses_audited" INTEGER DEFAULT 0,
    "stats" JSONB,

    CONSTRAINT "collection_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "business" ADD CONSTRAINT "business_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "collection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scrape_result" ADD CONSTRAINT "scrape_result_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
