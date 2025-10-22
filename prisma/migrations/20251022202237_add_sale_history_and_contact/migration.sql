-- CreateTable
CREATE TABLE "SaleHistory" (
    "id" SERIAL NOT NULL,
    "saleId" INTEGER NOT NULL,
    "previousStatus" "SaleStatus",
    "newStatus" "SaleStatus" NOT NULL,
    "comment" TEXT,
    "performedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SaleHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SaleHistory_saleId_idx" ON "SaleHistory"("saleId");

-- AddForeignKey
ALTER TABLE "SaleHistory" ADD CONSTRAINT "SaleHistory_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
