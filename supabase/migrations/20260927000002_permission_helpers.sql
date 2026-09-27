-- ===========================================================================
-- Epic 0 / Unit 6 (part 1): permission helpers for row-level security
-- Spec: docs/specs/19-spec-security-remediation (FR-6.1, FR-6.2)
-- ===========================================================================
--
-- Why: the write policies in the next migration are expressed in terms of the
-- app's permissions. Two things the app knows that the database did not:
--
--   1. Role inheritance (20260923000000_role_inheritance.sql). A role may be
--      "based on" another and gains its permissions transitively. The old
--      auth_user_has_permission() only looked at the roles a user holds
--      directly, so a user whose permission came from a base role passed the
--      app check and failed every policy.
--
--   2. CHA-role permissions. While a weekend is ACTIVE, its Rector, Backup
--      Rector, Head, Assistant Head and Roster cha get WRITE_TEAM_ROSTER (and
--      the first four get READ_WRITE_TEAM_PAYMENTS) from their roster placement
--      alone, with no database role (lib/security.ts CHA_ROLE_PERMISSIONS and
--      services/identity/user/user-service.ts). Policies built only on database
--      roles would lock those leaders out of the roster builder and team
--      payments.
--
-- Both functions are SECURITY DEFINER so a policy on user_roles / roles /
-- weekend_roster can call them without recursing into its own table's policies.
-- Only `authenticated` may execute them; policies run as the querying role.
--
-- Idempotent: CREATE OR REPLACE throughout.

-- ---------------------------------------------------------------------------
-- 1. auth_user_has_permission(text): now honours roles.based_on_role_id
-- ---------------------------------------------------------------------------
-- Same signature as 20260821000000 so the payment, fee and email_log policies
-- that already call it keep working. Mirrors userHasPermission() plus
-- getEffectivePermissions() in services/identity/roles/inheritance.ts:
-- FULL_ACCESS anywhere in the chain satisfies any check. The recursion is
-- bounded (depth < 100) in case a loop ever slips past the cycle trigger.
CREATE OR REPLACE FUNCTION public.auth_user_has_permission(required_permission TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE effective_roles AS (
    SELECT r.id, r.permissions, r.based_on_role_id, 1 AS depth
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
    UNION ALL
    SELECT parent.id, parent.permissions, parent.based_on_role_id, child.depth + 1
    FROM effective_roles child
    JOIN roles parent ON parent.id = child.based_on_role_id
    WHERE child.depth < 100
  )
  SELECT EXISTS (
    SELECT 1
    FROM effective_roles
    WHERE 'FULL_ACCESS' = ANY(permissions)
       OR required_permission = ANY(permissions)
  );
$$;

COMMENT ON FUNCTION public.auth_user_has_permission(TEXT) IS
  'True when the calling user holds the given permission, or FULL_ACCESS, through any role they hold directly or inherit via roles.based_on_role_id. Mirrors userHasPermission() + getEffectivePermissions() in the app.';

-- ---------------------------------------------------------------------------
-- 2. auth_user_cha_has_permission(text): permissions from roster placement
-- ---------------------------------------------------------------------------
-- MIRRORS lib/security.ts CHA_ROLE_PERMISSIONS. The role lists below are
-- checked against that map by lib/security/cha-permissions-sql.test.ts; change
-- both together. Only the permissions RLS needs are mapped here.
--
-- "Active, not dropped" copies services/identity/user/user-service.ts: a
-- weekend_roster row for the caller whose weekend has status 'ACTIVE' and whose
-- roster status is not 'drop' (NULL counts as active). cha_role strings come
-- from the CHARole enum in lib/weekend/types.ts.
CREATE OR REPLACE FUNCTION public.auth_user_cha_has_permission(required_permission TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM weekend_roster wr
    JOIN weekends w ON w.id = wr.weekend_id
    WHERE wr.user_id = auth.uid()
      AND wr.status IS DISTINCT FROM 'drop'
      AND w.status = 'ACTIVE'
      AND wr.cha_role = ANY (
        CASE required_permission
          WHEN 'WRITE_TEAM_ROSTER' THEN
            ARRAY['Rector', 'Backup Rector', 'Head', 'Assistant Head', 'Roster']
          WHEN 'READ_WRITE_TEAM_PAYMENTS' THEN
            ARRAY['Rector', 'Backup Rector', 'Head', 'Assistant Head']
          WHEN 'READ_TEAM_ROSTER_BUILDER' THEN
            ARRAY['Rector']
          ELSE ARRAY[]::text[]
        END
      )
  );
$$;

COMMENT ON FUNCTION public.auth_user_cha_has_permission(TEXT) IS
  'True when the calling user holds the given permission through a CHA role on an ACTIVE weekend (non-dropped weekend_roster row). Mirrors CHA_ROLE_PERMISSIONS in lib/security.ts; kept in sync by lib/security/cha-permissions-sql.test.ts.';

-- ---------------------------------------------------------------------------
-- 3. Execute grants: authenticated only
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.auth_user_has_permission(TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.auth_user_cha_has_permission(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.auth_user_has_permission(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.auth_user_cha_has_permission(TEXT) TO authenticated, service_role;
