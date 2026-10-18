-- Migration: SEND_WEEKEND_EMAIL for the Admin and Pre Weekend Couple roles
--
-- SEND_WEEKEND_EMAIL lets a role email a weekend group's people (both teams,
-- one team, or the group's new pescadores) from the weekend hub and the
-- Secuela page. Board roles inherit Admin, so they get it too. Weekend leaders
-- (Rector, Head, Assistant Head…) get it from their CHA role in code, scoped to
-- their own weekend's team.
--
-- Additive and idempotent: appends the permission only where it is missing.

UPDATE "public"."roles"
SET "permissions" = array_append("permissions", 'SEND_WEEKEND_EMAIL')
WHERE "label" IN ('Admin', 'Pre Weekend Couple')
  AND NOT ('SEND_WEEKEND_EMAIL' = ANY ("permissions"));
