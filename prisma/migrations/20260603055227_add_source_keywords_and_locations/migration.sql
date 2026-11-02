-- AlterTable
ALTER TABLE "business" ADD COLUMN     "source_keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "source_locations" TEXT[] DEFAULT ARRAY[]::TEXT[];
