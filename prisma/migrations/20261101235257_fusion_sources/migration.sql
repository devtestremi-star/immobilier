-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "duplicateOf" INTEGER,
ADD COLUMN     "others" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "source" TEXT,
ADD COLUMN     "zone" TEXT,
ADD COLUMN     "zoneDist" INTEGER,
ALTER COLUMN "publishedAt" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Listing_duplicateOf_idx" ON "Listing"("duplicateOf");
