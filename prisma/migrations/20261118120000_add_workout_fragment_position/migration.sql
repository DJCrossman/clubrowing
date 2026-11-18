ALTER TABLE "workout_fragment" ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;

-- Pieces were never ordered. The row order on disk is the closest record of the
-- order they were saved in, so number each workout's pieces by it.
UPDATE "workout_fragment" AS fragment
SET "position" = ordered.position
FROM (
	SELECT id, ROW_NUMBER() OVER (PARTITION BY "workoutId" ORDER BY ctid) - 1 AS position
	FROM "workout_fragment"
) AS ordered
WHERE fragment.id = ordered.id;
