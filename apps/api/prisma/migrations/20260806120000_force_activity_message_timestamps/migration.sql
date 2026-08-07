-- Legacy repair pass. Some early local Wardfy databases recorded the initial
-- migration before ActivityMessage timestamp fields existed.
ALTER TABLE "ActivityMessage"
  ADD COLUMN IF NOT EXISTS "lastTrackSpotifyId" TEXT;

ALTER TABLE "ActivityMessage"
  ADD COLUMN IF NOT EXISTS "lastRenderedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "ActivityMessage"
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "ActivityMessage"
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
