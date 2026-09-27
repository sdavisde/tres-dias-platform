-- ===========================================================================
-- Epic 0 / Unit 6 (part 2): remaining authenticated write policies
-- Spec: docs/specs/19-spec-security-remediation (FR-6.3 .. FR-6.10)
-- ===========================================================================
--
-- Why: after Units 1 and 5, `authenticated` could still INSERT / UPDATE / DELETE
-- almost every table with `USING (true)`, so any logged-in member could place
-- themselves on a roster, record a payment or rewrite a weekend directly through
-- PostgREST. This migration makes each write require the permission the app
-- already checks for that operation. Authenticated SELECT stays open everywhere
-- (owner decision). Rows written by the Stripe webhook, roster sync and the
-- candidate-move flow use the service-role client and bypass RLS.
--
-- Vocabulary in the expressions below:
--   hp(p)  = public.auth_user_has_permission(p)            (DB roles + inheritance)
--   hpc(p) = hp(p) OR public.auth_user_cha_has_permission(p) (also CHA role on ACTIVE weekend)
-- Both come from 20260927000002_permission_helpers.sql. FULL_ACCESS satisfies
-- hp() for any p, which also covers impersonation (auth.uid() stays the admin).
--
-- Order inside the file follows FR-6.10: roles-independent tables, then
-- candidates (needs Unit 5), then roster tables (needs the CHA helper), then
-- payments and per-member rows.
--
-- Policies DROPPED and RECREATED (one per line, by table):
--   events
--     - "Enable insert for authenticated users only"   -> "events_insert_write_events"
--     - "Enable update for authenticated users only"   -> "events_update_write_events"
--     - "Enable delete for authenticated users only"   -> "events_delete_write_events"
--   site_settings (restrictive fee-key policies from 20260924000000 are kept)
--     - "Allow authenticated users to insert site_settings" -> "site_settings_insert_settings_or_fees"
--     - "Allow authenticated users to update site_settings" -> "site_settings_update_settings_or_fees"
--   community_encouragements
--     - "Enable insert for authenticated users only"   -> "community_encouragements_insert_write"
--     - "Enable update for authenticated users only"   -> "community_encouragements_update_write"
--   contact_information
--     - "Allow authenticated users to update contact information" -> "contact_information_update_write_user_roles"
--     - "Allow authenticated users to insert contact information" -> (dropped, no replacement)
--     - "Allow authenticated users to delete contact information" -> (dropped, no replacement)
--   meeting_minutes_metadata
--     - "Enable insert for authenticated users only"   -> "meeting_minutes_insert_files_upload"
--     - "Enable update for authenticated users only"   -> "meeting_minutes_update_files_upload"
--     - "Enable delete for authenticated users only"   -> "meeting_minutes_delete_files_delete"
--   weekends
--     - "Allow authenticated users to insert weekends" -> "weekends_insert_write_weekends"
--     - "Allow authenticated users to update weekends" -> "weekends_update_write_weekends"
--     - (none)                                         -> "weekends_delete_write_weekends"  (NEW)
--   weekend_groups (fee guard trigger from 20260924000000 is kept)
--     - "Enable insert for authenticated users only"   -> "weekend_groups_insert_write_weekends"
--     - "Enable update for authenticated users only"   -> "weekend_groups_update_weekends_or_fees"
--     - "Enable delete for authenticated users only"   -> "weekend_groups_delete_write_weekends"
--   candidates
--     - "Allow authenticated users to update candidates" -> "candidates_update_write_candidates"
--     - "Allow authenticated users to delete candidates" -> "candidates_delete_delete_candidates"
--   candidate_info
--     - "Allow authenticated users to update candidate_info" -> "candidate_info_update_write_candidates"
--     - "Allow authenticated users to delete candidate_info" -> "candidate_info_delete_delete_candidates"
--   candidate_sponsorship_info
--     - "Allow authenticated users to update candidate_sponsorship_info" -> "candidate_sponsorship_info_update_write_candidates"
--     - "Allow authenticated users to delete candidate_sponsorship_info" -> "candidate_sponsorship_info_delete_delete_candidates"
--   weekend_roster
--     - "Enable insert for authenticated users only"   -> "weekend_roster_insert_write_team_roster"
--     - "Enable update for authenticated users only"   -> "weekend_roster_update_write_team_roster"
--     - "Enable delete for authenticated users only"   -> "weekend_roster_delete_write_team_roster"
--   draft_weekend_roster
--     - "Enable insert for authenticated users only"   -> "draft_weekend_roster_insert_write_team_roster"
--     - "Enable update for authenticated users only"   -> "draft_weekend_roster_update_write_team_roster"
--     - "Enable delete for authenticated users only"   -> "draft_weekend_roster_delete_write_team_roster"
--   weekend_group_members
--     - "Enable insert for authenticated users only"   -> "weekend_group_members_insert_own_or_roster"
--     - "Enable update for authenticated users only"   -> "weekend_group_members_update_own_or_roster"
--     - "Enable delete for authenticated users only"   -> "weekend_group_members_delete_write_team_roster"
--   payment_transaction (UPDATE/DELETE from 20260821000000 are kept)
--     - "Authenticated users can insert payment_transaction" -> "payment_transaction_insert_payments_or_team_cash"
--   deposits
--     - "Authenticated users can insert deposits"      -> (dropped, webhook-only via service role)
--     - "Authenticated users can update deposits"      -> (dropped)
--     - "Authenticated users can delete deposits"      -> (dropped)
--   deposit_payments
--     - "Authenticated users can insert deposit_payments" -> (dropped)
--     - "Authenticated users can update deposit_payments" -> (dropped)
--     - "Authenticated users can delete deposit_payments" -> (dropped)
--   team_form_completions
--     - "Enable insert for authenticated users only"   -> "team_form_completions_insert_own_or_full_access"
--     - "Enable update for authenticated users only"   -> "team_form_completions_update_own_or_full_access"
--   users_experience
--     - "Enable insert for authenticated users only"   -> "users_experience_insert_own_admin_or_weekends"
--     - "Enable update for authenticated users"        -> "users_experience_update_own_or_full_access"
--     - "Enable delete for authenticated users"        -> "users_experience_delete_own_or_full_access"
--
-- Idempotent: every DROP is IF EXISTS and every CREATE is preceded by a DROP of
-- the new name, so the file can be re-run.

-- ===========================================================================
-- A. Roles-independent tables
-- ===========================================================================

-- events: only the admin Events page writes, behind WRITE_EVENTS
-- (app/admin/events/page.tsx canEdit; services/events/actions.ts now wrapped).
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.events;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.events;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.events;
DROP POLICY IF EXISTS "events_insert_write_events" ON public.events;
DROP POLICY IF EXISTS "events_update_write_events" ON public.events;
DROP POLICY IF EXISTS "events_delete_write_events" ON public.events;

CREATE POLICY "events_insert_write_events" ON public.events
  FOR INSERT TO authenticated
  WITH CHECK (public.auth_user_has_permission('WRITE_EVENTS'));
CREATE POLICY "events_update_write_events" ON public.events
  FOR UPDATE TO authenticated
  USING (public.auth_user_has_permission('WRITE_EVENTS'))
  WITH CHECK (public.auth_user_has_permission('WRITE_EVENTS'));
CREATE POLICY "events_delete_write_events" ON public.events
  FOR DELETE TO authenticated
  USING (public.auth_user_has_permission('WRITE_EVENTS'));

-- site_settings: WRITE_SETTINGS (settings page) or MANAGE_FEES (fee defaults).
-- The RESTRICTIVE fee-key policies still apply on top of these.
DROP POLICY IF EXISTS "Allow authenticated users to insert site_settings" ON public.site_settings;
DROP POLICY IF EXISTS "Allow authenticated users to update site_settings" ON public.site_settings;
DROP POLICY IF EXISTS "site_settings_insert_settings_or_fees" ON public.site_settings;
DROP POLICY IF EXISTS "site_settings_update_settings_or_fees" ON public.site_settings;

CREATE POLICY "site_settings_insert_settings_or_fees" ON public.site_settings
  FOR INSERT TO authenticated
  WITH CHECK (
    public.auth_user_has_permission('WRITE_SETTINGS')
    OR public.auth_user_has_permission('MANAGE_FEES')
  );
CREATE POLICY "site_settings_update_settings_or_fees" ON public.site_settings
  FOR UPDATE TO authenticated
  USING (
    public.auth_user_has_permission('WRITE_SETTINGS')
    OR public.auth_user_has_permission('MANAGE_FEES')
  )
  WITH CHECK (
    public.auth_user_has_permission('WRITE_SETTINGS')
    OR public.auth_user_has_permission('MANAGE_FEES')
  );

-- community_encouragements: updateCommunityEncouragement is wrapped with
-- WRITE_COMMUNITY_ENCOURAGEMENT.
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.community_encouragements;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.community_encouragements;
DROP POLICY IF EXISTS "community_encouragements_insert_write" ON public.community_encouragements;
DROP POLICY IF EXISTS "community_encouragements_update_write" ON public.community_encouragements;

CREATE POLICY "community_encouragements_insert_write" ON public.community_encouragements
  FOR INSERT TO authenticated
  WITH CHECK (public.auth_user_has_permission('WRITE_COMMUNITY_ENCOURAGEMENT'));
CREATE POLICY "community_encouragements_update_write" ON public.community_encouragements
  FOR UPDATE TO authenticated
  USING (public.auth_user_has_permission('WRITE_COMMUNITY_ENCOURAGEMENT'))
  WITH CHECK (public.auth_user_has_permission('WRITE_COMMUNITY_ENCOURAGEMENT'));

-- contact_information: both update actions require WRITE_USER_ROLES. Nothing in
-- the app inserts or deletes rows, so those policies go away.
DROP POLICY IF EXISTS "Allow authenticated users to update contact information" ON public.contact_information;
DROP POLICY IF EXISTS "Allow authenticated users to insert contact information" ON public.contact_information;
DROP POLICY IF EXISTS "Allow authenticated users to delete contact information" ON public.contact_information;
DROP POLICY IF EXISTS "contact_information_update_write_user_roles" ON public.contact_information;

CREATE POLICY "contact_information_update_write_user_roles" ON public.contact_information
  FOR UPDATE TO authenticated
  USING (public.auth_user_has_permission('WRITE_USER_ROLES'))
  WITH CHECK (public.auth_user_has_permission('WRITE_USER_ROLES'));

-- meeting_minutes_metadata: saved by the FILES_UPLOAD action; deletion happens
-- in the SECURITY DEFINER cleanup trigger, so the DELETE policy only matters
-- for direct deletes by FILES_DELETE holders.
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.meeting_minutes_metadata;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.meeting_minutes_metadata;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.meeting_minutes_metadata;
DROP POLICY IF EXISTS "meeting_minutes_insert_files_upload" ON public.meeting_minutes_metadata;
DROP POLICY IF EXISTS "meeting_minutes_update_files_upload" ON public.meeting_minutes_metadata;
DROP POLICY IF EXISTS "meeting_minutes_delete_files_delete" ON public.meeting_minutes_metadata;

CREATE POLICY "meeting_minutes_insert_files_upload" ON public.meeting_minutes_metadata
  FOR INSERT TO authenticated
  WITH CHECK (public.auth_user_has_permission('FILES_UPLOAD'));
CREATE POLICY "meeting_minutes_update_files_upload" ON public.meeting_minutes_metadata
  FOR UPDATE TO authenticated
  USING (public.auth_user_has_permission('FILES_UPLOAD'))
  WITH CHECK (public.auth_user_has_permission('FILES_UPLOAD'));
CREATE POLICY "meeting_minutes_delete_files_delete" ON public.meeting_minutes_metadata
  FOR DELETE TO authenticated
  USING (public.auth_user_has_permission('FILES_DELETE'));

-- weekends: every write goes through WRITE_WEEKENDS actions. The DELETE policy
-- is new: deleteWeekendsByGroupId (services/weekend/repository.ts) silently
-- deleted zero rows before because no policy existed.
DROP POLICY IF EXISTS "Allow authenticated users to insert weekends" ON public.weekends;
DROP POLICY IF EXISTS "Allow authenticated users to update weekends" ON public.weekends;
DROP POLICY IF EXISTS "weekends_insert_write_weekends" ON public.weekends;
DROP POLICY IF EXISTS "weekends_update_write_weekends" ON public.weekends;
DROP POLICY IF EXISTS "weekends_delete_write_weekends" ON public.weekends;

CREATE POLICY "weekends_insert_write_weekends" ON public.weekends
  FOR INSERT TO authenticated
  WITH CHECK (public.auth_user_has_permission('WRITE_WEEKENDS'));
CREATE POLICY "weekends_update_write_weekends" ON public.weekends
  FOR UPDATE TO authenticated
  USING (public.auth_user_has_permission('WRITE_WEEKENDS'))
  WITH CHECK (public.auth_user_has_permission('WRITE_WEEKENDS'));
CREATE POLICY "weekends_delete_write_weekends" ON public.weekends
  FOR DELETE TO authenticated
  USING (public.auth_user_has_permission('WRITE_WEEKENDS'));

-- weekend_groups: created/deleted by WRITE_WEEKENDS; updated by WRITE_WEEKENDS
-- (sidebar) or MANAGE_FEES (fee changes). guard_and_log_weekend_group_fees
-- keeps guarding the fee columns on top of this.
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.weekend_groups;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.weekend_groups;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.weekend_groups;
DROP POLICY IF EXISTS "weekend_groups_insert_write_weekends" ON public.weekend_groups;
DROP POLICY IF EXISTS "weekend_groups_update_weekends_or_fees" ON public.weekend_groups;
DROP POLICY IF EXISTS "weekend_groups_delete_write_weekends" ON public.weekend_groups;

CREATE POLICY "weekend_groups_insert_write_weekends" ON public.weekend_groups
  FOR INSERT TO authenticated
  WITH CHECK (public.auth_user_has_permission('WRITE_WEEKENDS'));
CREATE POLICY "weekend_groups_update_weekends_or_fees" ON public.weekend_groups
  FOR UPDATE TO authenticated
  USING (
    public.auth_user_has_permission('WRITE_WEEKENDS')
    OR public.auth_user_has_permission('MANAGE_FEES')
  )
  WITH CHECK (
    public.auth_user_has_permission('WRITE_WEEKENDS')
    OR public.auth_user_has_permission('MANAGE_FEES')
  );
CREATE POLICY "weekend_groups_delete_write_weekends" ON public.weekend_groups
  FOR DELETE TO authenticated
  USING (public.auth_user_has_permission('WRITE_WEEKENDS'));

-- ===========================================================================
-- B. Candidate tables (safe only after Unit 5 moved the public forms status
--    flip onto the service-role client). INSERT and SELECT stay open so any
--    member can sponsor a candidate.
-- ===========================================================================
DROP POLICY IF EXISTS "Allow authenticated users to update candidates" ON public.candidates;
DROP POLICY IF EXISTS "Allow authenticated users to delete candidates" ON public.candidates;
DROP POLICY IF EXISTS "candidates_update_write_candidates" ON public.candidates;
DROP POLICY IF EXISTS "candidates_delete_delete_candidates" ON public.candidates;

CREATE POLICY "candidates_update_write_candidates" ON public.candidates
  FOR UPDATE TO authenticated
  USING (public.auth_user_has_permission('WRITE_CANDIDATES'))
  WITH CHECK (public.auth_user_has_permission('WRITE_CANDIDATES'));
CREATE POLICY "candidates_delete_delete_candidates" ON public.candidates
  FOR DELETE TO authenticated
  USING (public.auth_user_has_permission('DELETE_CANDIDATES'));

DROP POLICY IF EXISTS "Allow authenticated users to update candidate_info" ON public.candidate_info;
DROP POLICY IF EXISTS "Allow authenticated users to delete candidate_info" ON public.candidate_info;
DROP POLICY IF EXISTS "candidate_info_update_write_candidates" ON public.candidate_info;
DROP POLICY IF EXISTS "candidate_info_delete_delete_candidates" ON public.candidate_info;

CREATE POLICY "candidate_info_update_write_candidates" ON public.candidate_info
  FOR UPDATE TO authenticated
  USING (public.auth_user_has_permission('WRITE_CANDIDATES'))
  WITH CHECK (public.auth_user_has_permission('WRITE_CANDIDATES'));
CREATE POLICY "candidate_info_delete_delete_candidates" ON public.candidate_info
  FOR DELETE TO authenticated
  USING (public.auth_user_has_permission('DELETE_CANDIDATES'));

DROP POLICY IF EXISTS "Allow authenticated users to update candidate_sponsorship_info" ON public.candidate_sponsorship_info;
DROP POLICY IF EXISTS "Allow authenticated users to delete candidate_sponsorship_info" ON public.candidate_sponsorship_info;
DROP POLICY IF EXISTS "candidate_sponsorship_info_update_write_candidates" ON public.candidate_sponsorship_info;
DROP POLICY IF EXISTS "candidate_sponsorship_info_delete_delete_candidates" ON public.candidate_sponsorship_info;

CREATE POLICY "candidate_sponsorship_info_update_write_candidates" ON public.candidate_sponsorship_info
  FOR UPDATE TO authenticated
  USING (public.auth_user_has_permission('WRITE_CANDIDATES'))
  WITH CHECK (public.auth_user_has_permission('WRITE_CANDIDATES'));
CREATE POLICY "candidate_sponsorship_info_delete_delete_candidates" ON public.candidate_sponsorship_info
  FOR DELETE TO authenticated
  USING (public.auth_user_has_permission('DELETE_CANDIDATES'));

-- ===========================================================================
-- C. Roster tables (need the CHA helper: the Rector, Head, Assistant Head and
--    Roster cha hold WRITE_TEAM_ROSTER only through their placement)
-- ===========================================================================
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.weekend_roster;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.weekend_roster;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.weekend_roster;
DROP POLICY IF EXISTS "weekend_roster_insert_write_team_roster" ON public.weekend_roster;
DROP POLICY IF EXISTS "weekend_roster_update_write_team_roster" ON public.weekend_roster;
DROP POLICY IF EXISTS "weekend_roster_delete_write_team_roster" ON public.weekend_roster;

CREATE POLICY "weekend_roster_insert_write_team_roster" ON public.weekend_roster
  FOR INSERT TO authenticated
  WITH CHECK (
    public.auth_user_has_permission('WRITE_TEAM_ROSTER')
    OR public.auth_user_cha_has_permission('WRITE_TEAM_ROSTER')
  );
CREATE POLICY "weekend_roster_update_write_team_roster" ON public.weekend_roster
  FOR UPDATE TO authenticated
  USING (
    public.auth_user_has_permission('WRITE_TEAM_ROSTER')
    OR public.auth_user_cha_has_permission('WRITE_TEAM_ROSTER')
  )
  WITH CHECK (
    public.auth_user_has_permission('WRITE_TEAM_ROSTER')
    OR public.auth_user_cha_has_permission('WRITE_TEAM_ROSTER')
  );
CREATE POLICY "weekend_roster_delete_write_team_roster" ON public.weekend_roster
  FOR DELETE TO authenticated
  USING (
    public.auth_user_has_permission('WRITE_TEAM_ROSTER')
    OR public.auth_user_cha_has_permission('WRITE_TEAM_ROSTER')
  );

DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.draft_weekend_roster;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.draft_weekend_roster;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.draft_weekend_roster;
DROP POLICY IF EXISTS "draft_weekend_roster_insert_write_team_roster" ON public.draft_weekend_roster;
DROP POLICY IF EXISTS "draft_weekend_roster_update_write_team_roster" ON public.draft_weekend_roster;
DROP POLICY IF EXISTS "draft_weekend_roster_delete_write_team_roster" ON public.draft_weekend_roster;

CREATE POLICY "draft_weekend_roster_insert_write_team_roster" ON public.draft_weekend_roster
  FOR INSERT TO authenticated
  WITH CHECK (
    public.auth_user_has_permission('WRITE_TEAM_ROSTER')
    OR public.auth_user_cha_has_permission('WRITE_TEAM_ROSTER')
  );
CREATE POLICY "draft_weekend_roster_update_write_team_roster" ON public.draft_weekend_roster
  FOR UPDATE TO authenticated
  USING (
    public.auth_user_has_permission('WRITE_TEAM_ROSTER')
    OR public.auth_user_cha_has_permission('WRITE_TEAM_ROSTER')
  )
  WITH CHECK (
    public.auth_user_has_permission('WRITE_TEAM_ROSTER')
    OR public.auth_user_cha_has_permission('WRITE_TEAM_ROSTER')
  );
CREATE POLICY "draft_weekend_roster_delete_write_team_roster" ON public.draft_weekend_roster
  FOR DELETE TO authenticated
  USING (
    public.auth_user_has_permission('WRITE_TEAM_ROSTER')
    OR public.auth_user_cha_has_permission('WRITE_TEAM_ROSTER')
  );

-- weekend_group_members: a member inserts and updates their OWN row when they
-- confirm secuela attendance (markSecuelaAttendance); roster placement writes
-- other people's rows and needs WRITE_TEAM_ROSTER.
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.weekend_group_members;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.weekend_group_members;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.weekend_group_members;
DROP POLICY IF EXISTS "weekend_group_members_insert_own_or_roster" ON public.weekend_group_members;
DROP POLICY IF EXISTS "weekend_group_members_update_own_or_roster" ON public.weekend_group_members;
DROP POLICY IF EXISTS "weekend_group_members_delete_write_team_roster" ON public.weekend_group_members;

CREATE POLICY "weekend_group_members_insert_own_or_roster" ON public.weekend_group_members
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR public.auth_user_has_permission('WRITE_TEAM_ROSTER')
    OR public.auth_user_cha_has_permission('WRITE_TEAM_ROSTER')
  );
CREATE POLICY "weekend_group_members_update_own_or_roster" ON public.weekend_group_members
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR public.auth_user_has_permission('WRITE_TEAM_ROSTER')
    OR public.auth_user_cha_has_permission('WRITE_TEAM_ROSTER')
  )
  WITH CHECK (
    user_id = auth.uid()
    OR public.auth_user_has_permission('WRITE_TEAM_ROSTER')
    OR public.auth_user_cha_has_permission('WRITE_TEAM_ROSTER')
  );
CREATE POLICY "weekend_group_members_delete_write_team_roster" ON public.weekend_group_members
  FOR DELETE TO authenticated
  USING (
    public.auth_user_has_permission('WRITE_TEAM_ROSTER')
    OR public.auth_user_cha_has_permission('WRITE_TEAM_ROSTER')
  );

-- ===========================================================================
-- D. Payments and per-member rows
-- ===========================================================================

-- payment_transaction INSERT: WRITE_PAYMENTS records anything (admin ledger,
-- candidate cash/check, waived); weekend leadership (via CHA or the Treasurer's
-- READ_WRITE_TEAM_PAYMENTS) may record only a team member's cash or check
-- payment. Stripe/webhook rows come through the service role.
DROP POLICY IF EXISTS "Authenticated users can insert payment_transaction" ON public.payment_transaction;
DROP POLICY IF EXISTS "payment_transaction_insert_payments_or_team_cash" ON public.payment_transaction;

CREATE POLICY "payment_transaction_insert_payments_or_team_cash" ON public.payment_transaction
  FOR INSERT TO authenticated
  WITH CHECK (
    public.auth_user_has_permission('WRITE_PAYMENTS')
    OR (
      (
        public.auth_user_has_permission('READ_WRITE_TEAM_PAYMENTS')
        OR public.auth_user_cha_has_permission('READ_WRITE_TEAM_PAYMENTS')
      )
      AND target_type = 'weekend_group_member'
      AND payment_method IN ('cash', 'check')
    )
  );

-- deposits / deposit_payments: written only by the payout webhook through the
-- service-role client. No authenticated write policy remains; SELECT stays.
DROP POLICY IF EXISTS "Authenticated users can insert deposits" ON public.deposits;
DROP POLICY IF EXISTS "Authenticated users can update deposits" ON public.deposits;
DROP POLICY IF EXISTS "Authenticated users can delete deposits" ON public.deposits;
DROP POLICY IF EXISTS "Authenticated users can insert deposit_payments" ON public.deposit_payments;
DROP POLICY IF EXISTS "Authenticated users can update deposit_payments" ON public.deposit_payments;
DROP POLICY IF EXISTS "Authenticated users can delete deposit_payments" ON public.deposit_payments;

-- team_form_completions: a member completes forms for their own group
-- membership (upsert needs INSERT and UPDATE). FULL_ACCESS covers impersonation.
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.team_form_completions;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.team_form_completions;
DROP POLICY IF EXISTS "team_form_completions_insert_own_or_full_access" ON public.team_form_completions;
DROP POLICY IF EXISTS "team_form_completions_update_own_or_full_access" ON public.team_form_completions;

CREATE POLICY "team_form_completions_insert_own_or_full_access" ON public.team_form_completions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.weekend_group_members m
      WHERE m.id = weekend_group_member_id AND m.user_id = auth.uid()
    )
    OR public.auth_user_has_permission('FULL_ACCESS')
  );
CREATE POLICY "team_form_completions_update_own_or_full_access" ON public.team_form_completions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.weekend_group_members m
      WHERE m.id = weekend_group_member_id AND m.user_id = auth.uid()
    )
    OR public.auth_user_has_permission('FULL_ACCESS')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.weekend_group_members m
      WHERE m.id = weekend_group_member_id AND m.user_id = auth.uid()
    )
    OR public.auth_user_has_permission('FULL_ACCESS')
  );

-- users_experience: members maintain their own service history; the admin
-- people editor (FULL_ACCESS) edits anyone's; activating a weekend group bulk
-- inserts history for the whole roster through the session client under
-- WRITE_WEEKENDS (services/weekend/repository.ts bulk insert).
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.users_experience;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.users_experience;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.users_experience;
DROP POLICY IF EXISTS "users_experience_insert_own_admin_or_weekends" ON public.users_experience;
DROP POLICY IF EXISTS "users_experience_update_own_or_full_access" ON public.users_experience;
DROP POLICY IF EXISTS "users_experience_delete_own_or_full_access" ON public.users_experience;

CREATE POLICY "users_experience_insert_own_admin_or_weekends" ON public.users_experience
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR public.auth_user_has_permission('FULL_ACCESS')
    OR public.auth_user_has_permission('WRITE_WEEKENDS')
  );
CREATE POLICY "users_experience_update_own_or_full_access" ON public.users_experience
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.auth_user_has_permission('FULL_ACCESS'))
  WITH CHECK (user_id = auth.uid() OR public.auth_user_has_permission('FULL_ACCESS'));
CREATE POLICY "users_experience_delete_own_or_full_access" ON public.users_experience
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.auth_user_has_permission('FULL_ACCESS'));
