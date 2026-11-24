-- CreateTable
CREATE TABLE "StoryPost" (
    "id" TEXT NOT NULL,
    "productId" TEXT,
    "slot" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "postedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoryPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StoryPost_postedAt_idx" ON "StoryPost"("postedAt");

-- CreateIndex
CREATE INDEX "StoryPost_productId_postedAt_idx" ON "StoryPost"("productId", "postedAt");

-- AddForeignKey
ALTER TABLE "StoryPost" ADD CONSTRAINT "StoryPost_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
