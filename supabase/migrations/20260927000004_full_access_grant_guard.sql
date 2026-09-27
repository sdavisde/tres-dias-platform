-- Epic 0 audit fix-ups (docs/specs/19-spec-security-remediation/evidence/independent-audit-2026-09-27.md)
--
--   H1  WRITE_USER_ROLES could reach FULL_ACCESS: a role editor could add FULL_ACCESS to any
--       role, base a role on "Full Access", or add themselves to the Full Access role. The app
--       now refuses those (services/identity/roles/role-service.ts) and so does the database.
--   M3  Any member could insert a candidate with any status via PostgREST. The sponsor form
--       only ever creates `sponsored` candidates, so the INSERT policy says so.
--   L1  Two trigger functions kept EXECUTE for PUBLIC (and therefore anon). Every function in
--       public now has EXECUTE revoked from PUBLIC and anon. Note: the `supabase_admin` default
--       ACL in schema public still names anon; migrations run as postgres and cannot alter it,
--       so every future function must REVOKE ... FROM PUBLIC explicitly.

-- ---------------------------------------------------------------------------
-- 1. role_grants_full_access(uuid): does this role, or any role it is based on,
--    carry FULL_ACCESS? Mirrors roleGrantsFullAccess() in
--    services/identity/roles/inheritance.ts. Depth-capped like auth_user_has_permission.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.role_grants_full_access(target_role_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE chain AS (
    SELECT r.id, r.permissions, r.based_on_role_id, 1 AS depth
    FROM roles r
    WHERE r.id = target_role_id
    UNION ALL
    SELECT parent.id, parent.permissions, parent.based_on_role_id, child.depth + 1
    FROM chain child
    JOIN roles parent ON parent.id = child.based_on_role_id
    WHERE child.depth < 100
  )
  SELECT EXISTS (SELECT 1 FROM chain WHERE 'FULL_ACCESS' = ANY(permissions));
$$;

REVOKE EXECUTE ON FUNCTION public.role_grants_full_access(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.role_grants_full_access(UUID) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2. roles: WRITE_USER_ROLES may create and edit roles, but a row that grants
--    FULL_ACCESS (own permission or via based_on_role_id), before or after the
--    change, needs FULL_ACCESS.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "roles_insert_write_user_roles" ON public.roles;
DROP POLICY IF EXISTS "roles_update_write_user_roles" ON public.roles;

CREATE POLICY "roles_insert_write_user_roles" ON public.roles
  FOR INSERT TO authenticated
  WITH CHECK (
    public.auth_user_has_permission('WRITE_USER_ROLES')
    AND (
      public.auth_user_has_permission('FULL_ACCESS')
      OR (
        NOT ('FULL_ACCESS' = ANY(permissions))
        AND (based_on_role_id IS NULL OR NOT public.role_grants_full_access(based_on_role_id))
      )
    )
  );

CREATE POLICY "roles_update_write_user_roles" ON public.roles
  FOR UPDATE TO authenticated
  USING (
    public.auth_user_has_permission('WRITE_USER_ROLES')
    AND (
      public.auth_user_has_permission('FULL_ACCESS')
      OR NOT public.role_grants_full_access(id)
    )
  )
  WITH CHECK (
    public.auth_user_has_permission('WRITE_USER_ROLES')
    AND (
      public.auth_user_has_permission('FULL_ACCESS')
      OR (
        NOT ('FULL_ACCESS' = ANY(permissions))
        AND (based_on_role_id IS NULL OR NOT public.role_grants_full_access(based_on_role_id))
      )
    )
  );

-- ---------------------------------------------------------------------------
-- 3. user_roles: assigning a role that grants FULL_ACCESS needs FULL_ACCESS.
--    Removing one (DELETE) is de-escalation and stays WRITE_USER_ROLES.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "user_roles_insert_write_user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_update_write_user_roles" ON public.user_roles;

CREATE POLICY "user_roles_insert_write_user_roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    public.auth_user_has_permission('WRITE_USER_ROLES')
    AND (
      public.auth_user_has_permission('FULL_ACCESS')
      OR NOT public.role_grants_full_access(role_id)
    )
  );

CREATE POLICY "user_roles_update_write_user_roles" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.auth_user_has_permission('WRITE_USER_ROLES'))
  WITH CHECK (
    public.auth_user_has_permission('WRITE_USER_ROLES')
    AND (
      public.auth_user_has_permission('FULL_ACCESS')
      OR NOT public.role_grants_full_access(role_id)
    )
  );

-- ---------------------------------------------------------------------------
-- 4. candidates INSERT: the sponsor form is the only member path and always
--    writes `sponsored`. candidate_info / candidate_sponsorship_info INSERT are
--    unchanged. The candidate-forms flow and the Stripe webhook use the admin
--    client and are unaffected.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow authenticated users to insert candidates" ON public.candidates;
CREATE POLICY "Allow authenticated users to insert candidates" ON public.candidates
  FOR INSERT TO authenticated
  WITH CHECK (status = 'sponsored'::public.candidate_status);

-- ---------------------------------------------------------------------------
-- 5. Function EXECUTE: nothing in public is callable by PUBLIC or anon.
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.roles_prevent_inheritance_cycle() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_community_encouragements_updated_at() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.auth_user_has_permission(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.auth_user_cha_has_permission(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sync_users() TO authenticated, service_role, supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.delete_meeting_minutes_metadata() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.guard_and_log_weekend_group_fees() TO authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
