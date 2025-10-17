-- CreateEnum
CREATE TYPE "SaleSource" AS ENUM ('WEB', 'ADMIN');

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "source" "SaleSource" NOT NULL DEFAULT 'ADMIN';
