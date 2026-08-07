-- Repair installations where the historical 20260806100000 migration was
-- applied before the Recommendation schema was introduced.
DO $$
BEGIN
  CREATE TYPE "RecommendationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DISMISSED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "Recommendation" (
  "id" TEXT NOT NULL,
  "fromUserId" TEXT NOT NULL,
  "toUserId" TEXT NOT NULL,
  "spotifyTrackUrl" TEXT NOT NULL,
  "trackLabel" TEXT NOT NULL,
  "note" TEXT,
  "status" "RecommendationStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "readAt" TIMESTAMP(3),
  CONSTRAINT "Recommendation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Recommendation_toUserId_status_createdAt_idx"
  ON "Recommendation"("toUserId", "status", "createdAt");

CREATE INDEX IF NOT EXISTS "Recommendation_fromUserId_createdAt_idx"
  ON "Recommendation"("fromUserId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Recommendation_fromUserId_fkey') THEN
    ALTER TABLE "Recommendation"
      ADD CONSTRAINT "Recommendation_fromUserId_fkey"
      FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Recommendation_toUserId_fkey') THEN
    ALTER TABLE "Recommendation"
      ADD CONSTRAINT "Recommendation_toUserId_fkey"
      FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
