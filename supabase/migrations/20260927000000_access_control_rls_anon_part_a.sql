-- ===========================================================================
-- Epic 0 / Unit 1: access-control policies and anonymous revocation, part A
-- Spec: docs/specs/19-spec-security-remediation (FR-1.1 .. FR-1.9)
-- ===========================================================================
--
-- Why: the baseline (20260118030550_remote_schema.sql) grants ALL to `anon` on every
-- table and has `USING (true)` policies for `anon, authenticated` on users, roles,
-- user_roles and the candidate tables. Anyone holding the public publishable key can
-- therefore grant themselves FULL_ACCESS or read candidate medical data without an
-- account, and any logged-in member can do the same. This migration:
--   * makes role/user writes require the permission the app already checks,
--   * removes `anon` from every policy and grant except the five the two public
--     flows (candidate forms, candidate fee) still depend on until Unit 5 ships,
--   * tightens storage so only FILES_UPLOAD / FILES_DELETE holders touch `files`.
-- Authenticated SELECT stays open everywhere (owner decision).
--
-- Policies DROPPED and RECREATED (one per line, by table):
--   roles
--     - "Allow all users to select roles"            (anon,authenticated SELECT true)
--         -> "roles_select_authenticated"            (authenticated SELECT true)
--     - "Allow all users to insert roles"            (anon,authenticated INSERT true)
--         -> "roles_insert_write_user_roles"         (authenticated, WRITE_USER_ROLES)
--     - "Allow all users to update roles"            (anon,authenticated UPDATE true)
--         -> "roles_update_write_user_roles"         (authenticated, WRITE_USER_ROLES)
--     - "Allow all users to delete roles"            (anon,authenticated DELETE true)
--         -> "roles_delete_write_user_roles"         (authenticated, WRITE_USER_ROLES)
--   user_roles
--     - "Allow all users to select user_roles"       -> "user_roles_select_authenticated"
--     - "Allow all users to insert user_roles"       -> "user_roles_insert_write_user_roles"
--     - "Allow all users to update user_roles"       -> "user_roles_update_write_user_roles"
--     - "Allow all users to delete user_roles"       -> "user_roles_delete_write_user_roles"
--   users
--     - "Allow all users to select users"            -> "users_select_authenticated"
--     - "Allow all users to insert users"            -> (no policy; rows come from the
--                                                       SECURITY DEFINER trigger sync_users)
--     - "Allow all users to update users"            -> "users_update_own_or_full_access"
--     - "Allow all users to delete users"            -> "users_delete_full_access"
--   candidates
--     - "Allow authenticated users to insert candidates"
--         (anon,authenticated INSERT true)          -> same name, authenticated only
--     - KEPT until Unit 5: "Enable read access for all users" (SELECT, anon+authenticated)
--     - KEPT until Unit 5: "Allow authenticated users to update candidates"
--   candidate_info
--     - "Allow authenticated users to update candidate_info"
--         (anon,authenticated UPDATE true)          -> same name, authenticated only
--     - KEPT until Unit 5: "Enable read access for all users" (SELECT, anon+authenticated)
--     - KEPT until Unit 5: "Allow authenticated users to insert candidate_info"
--   candidate_sponsorship_info
--     - "Allow authenticated users to create candidate_sponsorship_info"
--         (anon,authenticated INSERT true)          -> same name, authenticated only
--     - "Allow authenticated users to update candidate_sponsorship_info"
--         (anon,authenticated UPDATE true)          -> same name, authenticated only
--     - KEPT until Unit 5: "Allow authenticated users to read candidate_sponsorship_info"
--   events
--     - "Enable read access for all users"           (public SELECT true)
--         -> same name, authenticated only
--   community_encouragements
--     - "Enable read access for all users"           (public SELECT true)
--         -> same name, authenticated only
--   candidate_payments (table dropped in 20260220200000; DROP IF EXISTS documents the check)
--     - "Allow authenticated users to insert candidate_payments"
--     - "Allow authenticated users to read candidate_payments"
--     - "Allow authenticated users to update candidate_payments"
--   storage.objects
--     - "Enable read access for all users"           (public SELECT true)
--         -> "objects_select_authenticated"          (authenticated SELECT true)
--     - "Enable insert for authenticated users only" (authenticated INSERT true)
--         -> "objects_insert_avatar_owner_or_files_upload"
--     - "Enable delete for users based on user_id"   (authenticated DELETE true)
--         -> "objects_delete_avatar_owner_or_files_delete"
--     - KEPT: "Public read access to avatars", "Avatar owner insert only",
--             "Avatar owner delete only", "Avatar owner update only" (20260627000000)
--   storage.buckets
--     - "Enable read access for all users"           (public SELECT true)
--         -> "buckets_select_authenticated"          (authenticated SELECT true)
--     - "Enable insert for authenticated users only" -> dropped, not recreated
--     - "Enable delete for users based on user_id"   -> dropped, not recreated
--
-- Grants: ALL table/sequence privileges and function EXECUTE revoked from anon; default
-- privileges for role postgres in schema public no longer include anon; then re-grant only
-- SELECT on candidates, candidate_info, candidate_sponsorship_info, INSERT on
-- candidate_info and UPDATE on candidates (removed again in Unit 5).
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- roles  (FR-1.1)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow all users to select roles" ON public.roles;
DROP POLICY IF EXISTS "Allow all users to insert roles" ON public.roles;
DROP POLICY IF EXISTS "Allow all users to update roles" ON public.roles;
DROP POLICY IF EXISTS "Allow all users to delete roles" ON public.roles;

CREATE POLICY "roles_select_authenticated" ON public.roles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "roles_insert_write_user_roles" ON public.roles
  FOR INSERT TO authenticated
  WITH CHECK (public.auth_user_has_permission('WRITE_USER_ROLES'));
CREATE POLICY "roles_update_write_user_roles" ON public.roles
  FOR UPDATE TO authenticated
  USING (public.auth_user_has_permission('WRITE_USER_ROLES'))
  WITH CHECK (public.auth_user_has_permission('WRITE_USER_ROLES'));
CREATE POLICY "roles_delete_write_user_roles" ON public.roles
  FOR DELETE TO authenticated
  USING (public.auth_user_has_permission('WRITE_USER_ROLES'));

-- ---------------------------------------------------------------------------
-- user_roles  (FR-1.2)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow all users to select user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Allow all users to insert user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Allow all users to update user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Allow all users to delete user_roles" ON public.user_roles;

CREATE POLICY "user_roles_select_authenticated" ON public.user_roles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "user_roles_insert_write_user_roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.auth_user_has_permission('WRITE_USER_ROLES'));
CREATE POLICY "user_roles_update_write_user_roles" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.auth_user_has_permission('WRITE_USER_ROLES'))
  WITH CHECK (public.auth_user_has_permission('WRITE_USER_ROLES'));
CREATE POLICY "user_roles_delete_write_user_roles" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.auth_user_has_permission('WRITE_USER_ROLES'));

-- ---------------------------------------------------------------------------
-- users  (FR-1.3)
-- No INSERT policy: rows are created by the SECURITY DEFINER trigger sync_users.
-- UPDATE: own row (including email; the sync_user_email_on_change trigger governs auth)
-- or FULL_ACCESS.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow all users to select users" ON public.users;
DROP POLICY IF EXISTS "Allow all users to insert users" ON public.users;
DROP POLICY IF EXISTS "Allow all users to update users" ON public.users;
DROP POLICY IF EXISTS "Allow all users to delete users" ON public.users;

CREATE POLICY "users_select_authenticated" ON public.users
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "users_update_own_or_full_access" ON public.users
  FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.auth_user_has_permission('FULL_ACCESS'))
  WITH CHECK (auth.uid() = id OR public.auth_user_has_permission('FULL_ACCESS'));
CREATE POLICY "users_delete_full_access" ON public.users
  FOR DELETE TO authenticated
  USING (public.auth_user_has_permission('FULL_ACCESS'));

-- ---------------------------------------------------------------------------
-- Candidate tables: drop anon where no public flow needs it  (FR-1.4)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow authenticated users to insert candidates" ON public.candidates;
CREATE POLICY "Allow authenticated users to insert candidates" ON public.candidates
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to update candidate_info" ON public.candidate_info;
CREATE POLICY "Allow authenticated users to update candidate_info" ON public.candidate_info
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to create candidate_sponsorship_info"
  ON public.candidate_sponsorship_info;
CREATE POLICY "Allow authenticated users to create candidate_sponsorship_info"
  ON public.candidate_sponsorship_info
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to update candidate_sponsorship_info"
  ON public.candidate_sponsorship_info;
CREATE POLICY "Allow authenticated users to update candidate_sponsorship_info"
  ON public.candidate_sponsorship_info
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Still needed by the public candidate-forms and candidate-fee pages until Unit 5:
--   candidates: "Enable read access for all users" (SELECT), "Allow authenticated users to
--   update candidates" (UPDATE); candidate_info: "Enable read access for all users" (SELECT),
--   "Allow authenticated users to insert candidate_info" (INSERT); candidate_sponsorship_info:
--   "Allow authenticated users to read candidate_sponsorship_info" (SELECT).

-- ---------------------------------------------------------------------------
-- Public-scoped SELECT policies with no TO clause  (FR-1.4)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Enable read access for all users" ON public.events;
CREATE POLICY "Enable read access for all users" ON public.events
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Enable read access for all users" ON public.community_encouragements;
CREATE POLICY "Enable read access for all users" ON public.community_encouragements
  FOR SELECT TO authenticated USING (true);

-- ---------------------------------------------------------------------------
-- Dead policies on the dropped candidate_payments table  (FR-1.5)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.candidate_payments') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Allow authenticated users to insert candidate_payments" ON public.candidate_payments';
    EXECUTE 'DROP POLICY IF EXISTS "Allow authenticated users to read candidate_payments" ON public.candidate_payments';
    EXECUTE 'DROP POLICY IF EXISTS "Allow authenticated users to update candidate_payments" ON public.candidate_payments';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Grants  (FR-1.6)
-- ---------------------------------------------------------------------------
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;

-- SECURITY DEFINER functions: also close the PUBLIC default and grant back only to the
-- roles that need them. Trigger functions run as the table owner regardless, but the
-- explicit grants keep `CREATE TRIGGER` (which checks EXECUTE) working for postgres.
REVOKE EXECUTE ON FUNCTION public.auth_user_has_permission(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_users() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_meeting_minutes_metadata() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.guard_and_log_weekend_group_fees() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.auth_user_has_permission(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sync_users() TO authenticated, service_role, supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.delete_meeting_minutes_metadata() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.guard_and_log_weekend_group_fees() TO authenticated, service_role;

-- Stop future tables/sequences/functions created by migrations from inheriting anon grants.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon;

-- Re-grant only what the two public flows still use until Unit 5.
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON public.candidates, public.candidate_info, public.candidate_sponsorship_info TO anon;
GRANT INSERT ON public.candidate_info TO anon;
GRANT UPDATE ON public.candidates TO anon;

-- ---------------------------------------------------------------------------
-- Storage objects  (FR-1.7)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Enable read access for all users" ON storage.objects;
CREATE POLICY "objects_select_authenticated" ON storage.objects
  FOR SELECT TO authenticated USING (true);
-- "Public read access to avatars" (20260627000000) stays: avatar CDN reads.

DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON storage.objects;
CREATE POLICY "objects_insert_avatar_owner_or_files_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    (bucket_id = 'avatars' AND name = auth.uid()::text || '.webp')
    OR (bucket_id = 'files' AND public.auth_user_has_permission('FILES_UPLOAD'))
  );

DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON storage.objects;
CREATE POLICY "objects_delete_avatar_owner_or_files_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    (bucket_id = 'avatars' AND name = auth.uid()::text || '.webp')
    OR (bucket_id = 'files' AND public.auth_user_has_permission('FILES_DELETE'))
  );
-- The restrictive avatar insert/delete guards and the owner UPDATE policy from
-- 20260627000000 remain in place.

-- ---------------------------------------------------------------------------
-- Storage buckets  (FR-1.8)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Enable read access for all users" ON storage.buckets;
CREATE POLICY "buckets_select_authenticated" ON storage.buckets
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON storage.buckets;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON storage.buckets;
