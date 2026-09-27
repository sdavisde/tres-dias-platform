-- ===========================================================================
-- Epic 0 / Unit 5: anonymous revocation, part B
-- Spec: docs/specs/19-spec-security-remediation (FR-5.3, FR-5.7)
-- ===========================================================================
--
-- Why: Unit 1 (20260927000000) removed `anon` from every policy and grant except
-- the five the two logged-out flows still used through the session client. Those
-- flows (candidate forms page, candidate fee page) now run on the admin client
-- inside server-only code with UUID and status validation, so anon needs nothing.
-- After this migration `anon` holds only USAGE on schema public.
--
-- Also adds the unique index that makes a candidate's forms submission idempotent:
-- `submitCandidateForms` relies on the unique violation to report "already
-- submitted" instead of inserting a second candidate_info row.
--
-- Policies DROPPED and RECREATED (same expression, `TO authenticated` only):
--   candidates
--     - "Enable read access for all users"                   (anon,authenticated SELECT true)
--     - "Allow authenticated users to update candidates"     (anon,authenticated UPDATE true)
--   candidate_info
--     - "Enable read access for all users"                   (anon,authenticated SELECT true)
--     - "Allow authenticated users to insert candidate_info" (anon,authenticated INSERT true)
--   candidate_sponsorship_info
--     - "Allow authenticated users to read candidate_sponsorship_info"
--                                                            (anon,authenticated SELECT true)
--
-- Grants REVOKED from anon (the last ones Unit 1 left in place):
--   SELECT ON candidates, candidate_info, candidate_sponsorship_info
--   INSERT ON candidate_info
--   UPDATE ON candidates
--
-- Authenticated access is unchanged: members keep reading these tables and the
-- sponsor form keeps inserting candidates and sponsorship info (Unit 6 tightens
-- the remaining authenticated writes).

-- ---------------------------------------------------------------------------
-- 1. Unique candidate_info row per candidate
-- ---------------------------------------------------------------------------
-- Duplicates would break the unique index. None exist locally or in prod as of
-- 2026-09-27; the cleanup below is defensive and keeps the newest row per
-- candidate should any appear before this migration runs.
DELETE FROM public.candidate_info ci
USING public.candidate_info newer
WHERE ci.candidate_id = newer.candidate_id
  AND ci.id <> newer.id
  AND (ci.created_at, ci.id) < (newer.created_at, newer.id);

CREATE UNIQUE INDEX IF NOT EXISTS candidate_info_candidate_id_key
  ON public.candidate_info (candidate_id);

-- ---------------------------------------------------------------------------
-- 2. candidates
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Enable read access for all users" ON public.candidates;
CREATE POLICY "Enable read access for all users"
  ON public.candidates FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to update candidates" ON public.candidates;
CREATE POLICY "Allow authenticated users to update candidates"
  ON public.candidates FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 3. candidate_info
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Enable read access for all users" ON public.candidate_info;
CREATE POLICY "Enable read access for all users"
  ON public.candidate_info FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert candidate_info" ON public.candidate_info;
CREATE POLICY "Allow authenticated users to insert candidate_info"
  ON public.candidate_info FOR INSERT TO authenticated WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 4. candidate_sponsorship_info
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow authenticated users to read candidate_sponsorship_info"
  ON public.candidate_sponsorship_info;
CREATE POLICY "Allow authenticated users to read candidate_sponsorship_info"
  ON public.candidate_sponsorship_info FOR SELECT TO authenticated USING (true);

-- ---------------------------------------------------------------------------
-- 5. The last anon grants
-- ---------------------------------------------------------------------------
REVOKE ALL ON TABLE public.candidates FROM anon;
REVOKE ALL ON TABLE public.candidate_info FROM anon;
REVOKE ALL ON TABLE public.candidate_sponsorship_info FROM anon;
