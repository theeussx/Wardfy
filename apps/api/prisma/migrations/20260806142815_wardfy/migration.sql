/*
  Warnings:

  - You are about to drop the column `createdAt` on the `ActivityMessage` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `ActivityMessage` table. All the data in the column will be lost.
  - You are about to drop the column `actorUserId` on the `AuditLog` table. All the data in the column will be lost.
  - You are about to drop the column `ipHash` on the `AuditLog` table. All the data in the column will be lost.
  - You are about to drop the column `payload` on the `AuditLog` table. All the data in the column will be lost.
  - You are about to drop the column `targetId` on the `AuditLog` table. All the data in the column will be lost.
  - You are about to drop the column `targetType` on the `AuditLog` table. All the data in the column will be lost.
  - Added the required column `actorId` to the `AuditLog` table without a default value. This is not possible if the table is not empty.
  - Made the column `guildId` on table `AuditLog` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_actorUserId_fkey";

-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_guildId_fkey";

-- DropIndex
DROP INDEX "ActivityMessage_channelId_idx";

-- DropIndex
DROP INDEX "ActivityMessage_guildId_userId_key";

-- DropIndex
DROP INDEX "AuditLog_actorUserId_createdAt_idx";

-- AlterTable
ALTER TABLE "ActivityMessage" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ALTER COLUMN "lastRenderedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "AuditLog" DROP COLUMN "actorUserId",
DROP COLUMN "ipHash",
DROP COLUMN "payload",
DROP COLUMN "targetId",
DROP COLUMN "targetType",
ADD COLUMN     "actorId" TEXT NOT NULL,
ADD COLUMN     "details" JSONB,
ALTER COLUMN "guildId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
