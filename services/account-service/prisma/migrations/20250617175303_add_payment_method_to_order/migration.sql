-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "status" SET DEFAULT 'pending_payment',
ALTER COLUMN "paymentMethod" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
