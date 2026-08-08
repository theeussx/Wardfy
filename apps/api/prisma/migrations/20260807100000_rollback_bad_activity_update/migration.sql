-- Rollback: restore ActivityMessage and AuditLog to pre-20260806142815 state
-- (reverses the erroneous migration that dropped unique constraints and obsolete columns)

-- ActivityMessage
ALTER TABLE "ActivityMessage"
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "ActivityMessage" ALTER COLUMN "lastRenderedAt" SET DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS "ActivityMessage_guildId_userId_key" ON "ActivityMessage"("guildId", "userId");
CREATE INDEX IF NOT EXISTS "ActivityMessage_channelId_idx" ON "ActivityMessage"("channelId");

-- AuditLog
ALTER TABLE "AuditLog"
  ADD COLUMN IF NOT EXISTS "actorUserId" TEXT,
  ADD COLUMN IF NOT EXISTS "ipHash" TEXT,
  ADD COLUMN IF NOT EXISTS "payload" JSONB,
  ADD COLUMN IF NOT EXISTS "targetId" TEXT,
  ADD COLUMN IF NOT EXISTS "targetType" TEXT;

ALTER TABLE "AuditLog" ALTER COLUMN "guildId" DROP NOT NULL;

ALTER TABLE "AuditLog" DROP COLUMN IF EXISTS "actorId";
ALTER TABLE "AuditLog" DROP COLUMN IF EXISTS "details";

DROP INDEX IF EXISTS "AuditLog_actorId_createdAt_idx";
CREATE INDEX IF NOT EXISTS "AuditLog_actorUserId_createdAt_idx" ON "AuditLog"("actorUserId", "createdAt");

ALTER TABLE "AuditLog" DROP CONSTRAINT IF EXISTS "AuditLog_actorId_fkey";
ALTER TABLE "AuditLog" DROP CONSTRAINT IF EXISTS "AuditLog_guildId_fkey";
ALTER TABLE "AuditLog" DROP CONSTRAINT IF EXISTS "AuditLog_actorUserId_fkey";

ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
