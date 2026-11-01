-- CreateTable
CREATE TABLE "Listing" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "transaction" TEXT NOT NULL,
    "access" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "city" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "surface" DOUBLE PRECISION NOT NULL,
    "floorRaw" TEXT,
    "floor" INTEGER,
    "floorsTotal" INTEGER,
    "elevator" BOOLEAN,
    "dpe" TEXT,
    "seller" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" SERIAL NOT NULL,
    "listingId" INTEGER NOT NULL,
    "author" TEXT NOT NULL,
    "score" INTEGER,
    "comment" TEXT,
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Listing_url_key" ON "Listing"("url");

-- CreateIndex
CREATE INDEX "Listing_department_idx" ON "Listing"("department");

-- CreateIndex
CREATE INDEX "Listing_price_idx" ON "Listing"("price");

-- CreateIndex
CREATE INDEX "Review_author_idx" ON "Review"("author");

-- CreateIndex
CREATE UNIQUE INDEX "Review_listingId_author_key" ON "Review"("listingId", "author");

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
