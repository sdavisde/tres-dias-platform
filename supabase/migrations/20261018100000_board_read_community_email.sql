-- Migration: READ_COMMUNITY_EMAIL for the President and Corresponding Secretary
--
-- Both board members can open Admin → Email and see what was sent to the
-- community (not write or send it).
--
-- Additive and idempotent: appends the permission only where it is missing.

UPDATE "public"."roles"
SET "permissions" = array_append("permissions", 'READ_COMMUNITY_EMAIL')
WHERE "label" IN ('President', 'Corresponding Secretary')
  AND NOT ('READ_COMMUNITY_EMAIL' = ANY ("permissions"));
