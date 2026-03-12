-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "billingPeriod" TEXT,
ADD COLUMN     "companyName" TEXT,
ADD COLUMN     "vendorCost" DECIMAL(14,2);
