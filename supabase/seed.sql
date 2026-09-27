-- =============================================================================
-- DTTD Seed Data
-- =============================================================================
-- Only the roles live here. Everything else (users, weekends, rosters,
-- candidates, payments) comes from the date-relative generator in scripts/seed:
--
--   yarn db:reset            -- migrations + this file + `yarn seed`
--   yarn seed [phase]        -- reseed app data without resetting the database
--
-- See scripts/seed/README.md for the phases.
-- =============================================================================

-- =============================================================================
-- SECTION: Roles
-- =============================================================================
-- Create the default roles for the application

INSERT INTO public.roles (id, label, permissions, description, type) VALUES
  ('a0000001-0000-4000-8000-000000000001', 'Full Access', ARRAY['FULL_ACCESS'], 'Full administrative access for managing settings, permissions, and org data.', 'COMMITTEE'),
  ('a0000002-0000-4000-8000-000000000002', 'Leaders Committee', ARRAY['DELETE_CANDIDATES', 'FILES_DELETE', 'FILES_UPLOAD', 'READ_ADMIN_PORTAL', 'READ_CANDIDATES', 'READ_DROPPED_ROSTER', 'READ_EVENTS', 'READ_PAYMENTS', 'READ_TEAM_ROSTER_BUILDER', 'READ_USER_EXPERIENCE', 'READ_USER_ROLES', 'READ_WEEKENDS', 'WRITE_CANDIDATES', 'WRITE_EVENTS', 'WRITE_PAYMENTS', 'WRITE_TEAM_ROSTER', 'WRITE_USER_ROLES', 'WRITE_WEEKENDS'], 'Committee members who advise and support board initiatives across the organization.', 'COMMITTEE'),
  ('a0000003-0000-4000-8000-000000000003', 'Admin', ARRAY['FILES_DELETE', 'FILES_UPLOAD', 'READ_ADMIN_PORTAL', 'READ_CANDIDATES', 'READ_DROPPED_ROSTER', 'READ_WEEKENDS'], 'Full administrative access for managing settings, permissions, and org data.', 'INDIVIDUAL'),
  ('a0000004-0000-4000-8000-000000000004', 'Pre Weekend Couple', ARRAY['READ_CANDIDATES', 'WRITE_CANDIDATES', 'DELETE_CANDIDATES'], 'Coordinates pre-weekend engagement and readiness for upcoming teams.', 'COMMITTEE'),
  ('a0000005-0000-4000-8000-000000000005', 'Corresponding Secretary', ARRAY['READ_ADMIN_PORTAL', 'READ_CANDIDATES', 'READ_USER_EXPERIENCE', 'READ_WEEKENDS', 'WRITE_TEAM_ROSTER', 'WRITE_USER_ROLES', 'WRITE_WEEKENDS'], 'Records and distributes board meeting minutes and official communications.', 'INDIVIDUAL'),
  ('a0000006-0000-4000-8000-000000000006', 'President', ARRAY['READ_ADMIN_PORTAL', 'READ_CANDIDATES', 'READ_DROPPED_ROSTER', 'READ_PAYMENTS', 'READ_USER_EXPERIENCE', 'READ_WEEKENDS'], 'Provides overall leadership, vision, and accountability for the community board.', 'INDIVIDUAL'),
  ('a0000007-0000-4000-8000-000000000007', 'Vice President', ARRAY['READ_ADMIN_PORTAL', 'READ_CANDIDATES', 'READ_DROPPED_ROSTER', 'READ_PAYMENTS', 'READ_USER_EXPERIENCE', 'READ_WEEKENDS'], 'Supports the president and coordinates cross-functional board efforts.', 'INDIVIDUAL'),
  ('a0000008-0000-4000-8000-000000000008', 'Treasurer', ARRAY['READ_PAYMENTS', 'READ_ADMIN_PORTAL'], 'Oversees financial reporting, budgeting, and stewardship guidance.', 'INDIVIDUAL'),
  ('a0000009-0000-4000-8000-000000000009', 'Recording Secretary', ARRAY[]::text[], 'Maintains records, meeting notes, and official documentation for board sessions.', 'INDIVIDUAL'),
  ('a0000010-0000-4000-8000-000000000010', 'Community Spiritual Director', ARRAY['WRITE_COMMUNITY_ENCOURAGEMENT'], 'Leads spiritual formation and provides guidance for the broader community.', 'INDIVIDUAL'),
  ('a0000011-0000-4000-8000-000000000011', 'At-Large Members', ARRAY[]::text[], 'General board members who participate in community decisions and initiatives.', 'COMMITTEE')
ON CONFLICT (id) DO NOTHING;
