-- Repair databases created with the first Wardfy activity-message schema.
-- IF NOT EXISTS keeps this migration safe for fresh installations.
ALTER TABLE "ActivityMessage"
  ADD COLUMN IF NOT EXISTS "lastTrackSpotifyId" TEXT;

ALTER TABLE "ActivityMessage"
  ADD COLUMN IF NOT EXISTS "lastRenderedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "ActivityMessage"
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "ActivityMessage"
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;