-- Attach past activities to the scheduled workout they happened during.
--
-- Same rule as new activities get when they arrive:
--   1. The workout is on an event, and its activity type is the activity's type.
--   2. The activity starts from 10 minutes before to 2 hours after the event.
--   3. The event is club-wide (a group event with no groups left counts, as on
--      the schedule), or the athlete is in one of its groups through a program
--      running on the day of the activity.
--   4. When several events fit, the one starting closest to the activity wins.
-- Only activities without a workout change, so running it again does nothing.
--
-- Undo: no activity had a workout before this ran, so clearing "workoutId" on
-- the activities created before it ran reverses it:
--   UPDATE "activity" SET "workoutId" = NULL
--   WHERE "workoutId" IS NOT NULL
--     AND "createdAt" < (
--         SELECT "started_at" AT TIME ZONE 'UTC' FROM "_prisma_migrations"
--         WHERE "migration_name" = '20261122180000_attach_activities_to_overlapping_workouts'
--     );

WITH "candidate" AS (
    SELECT
        a."id" AS "activityId",
        w."id" AS "workoutId",
        abs(extract(EPOCH FROM a."startDate" - e."startAt")) AS "gap"
    FROM "activity" a
    JOIN "workout" w ON w."activityType" = a."type"
    JOIN "event" e ON e."workoutId" = w."id"
    WHERE a."workoutId" IS NULL
      AND a."startDate" >= e."startAt" - INTERVAL '10 minutes'
      AND a."startDate" < e."startAt" + INTERVAL '120 minutes'
      AND (
          e."audience" = 'club'
          OR NOT EXISTS (SELECT 1 FROM "event_group" eg WHERE eg."eventId" = e."id")
          OR EXISTS (
              SELECT 1
              FROM "event_group" eg
              JOIN "group_program" gp ON gp."groupId" = eg."groupId"
              JOIN "program" p ON p."id" = gp."programId"
              JOIN "membership" m ON m."programId" = p."id"
              WHERE eg."eventId" = e."id"
                AND m."athleteId" = a."athleteId"
                AND (p."startDate" IS NULL OR p."startDate" <= (a."startDate" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Regina')::date)
                AND (p."endDate" IS NULL OR p."endDate" >= (a."startDate" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Regina')::date)
          )
      )
),
"closest" AS (
    SELECT DISTINCT ON ("activityId") "activityId", "workoutId"
    FROM "candidate"
    ORDER BY "activityId", "gap", "workoutId"
)
UPDATE "activity" a
SET "workoutId" = c."workoutId"
FROM "closest" c
WHERE a."id" = c."activityId";
