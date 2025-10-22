/*
  Warnings:

  - A unique constraint covering the columns `[trackingCode]` on the table `Sale` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "trackingCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Sale_trackingCode_key" ON "Sale"("trackingCode");
