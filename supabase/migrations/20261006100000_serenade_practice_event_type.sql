-- Serenade practice: one per weekend, Saturday afternoon before the serenade.
-- Tracked as its own type so the admin Weekends page can treat it as a
-- standard weekend event alongside sendoff, weekend, serenade and closing.
ALTER TYPE "public"."event_type" ADD VALUE IF NOT EXISTS 'serenade_practice';
