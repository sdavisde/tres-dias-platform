-- =============================================================================
-- DTTD Seed Data
-- =============================================================================
-- This file seeds the database with test data for local development.
-- Run with: supabase db reset (which runs migrations then seed.sql)
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
  ('a0000008-0000-4000-8000-000000000008', 'Treasurer', ARRAY['READ_PAYMENTS', 'READ_WRITE_TEAM_PAYMENTS', 'WRITE_PAYMENTS', 'READ_ADMIN_PORTAL'], 'Oversees financial reporting, budgeting, and stewardship guidance.', 'INDIVIDUAL'),
  ('a0000009-0000-4000-8000-000000000009', 'Recording Secretary', ARRAY[]::text[], 'Maintains records, meeting notes, and official documentation for board sessions.', 'INDIVIDUAL'),
  ('a0000010-0000-4000-8000-000000000010', 'Community Spiritual Director', ARRAY['WRITE_COMMUNITY_ENCOURAGEMENT'], 'Leads spiritual formation and provides guidance for the broader community.', 'INDIVIDUAL'),
  ('a0000011-0000-4000-8000-000000000011', 'At-Large Members', ARRAY[]::text[], 'General board members who participate in community decisions and initiatives.', 'COMMITTEE')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- SECTION: Auth Users (auth.users table)
-- =============================================================================
-- These are the Supabase auth users that will be synced to public.users
-- Password for all users: "password"

-- Enable pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES
  -- User 1: sdavisde@gmail.com (Admin)
  (
    'b0000001-0000-4000-8000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'sdavisde@gmail.com',
    extensions.crypt('password', extensions.gen_salt('bf')),
    now(),
    '{"first_name": "Sean", "last_name": "Davis", "gender": "Male"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  -- User 2: nick44fierro@gmail.com (Admin)
  (
    'b0000002-0000-4000-8000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'nick44fierro@gmail.com',
    extensions.crypt('password', extensions.gen_salt('bf')),
    now(),
    '{"first_name": "Nick", "last_name": "Fierro", "gender": "Male"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  -- User 3
  (
    'b0000003-0000-4000-8000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'john.smith@example.com',
    extensions.crypt('password', extensions.gen_salt('bf')),
    now(),
    '{"first_name": "John", "last_name": "Smith", "gender": "Male"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  -- User 4
  (
    'b0000004-0000-4000-8000-000000000004',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'jane.doe@example.com',
    extensions.crypt('password', extensions.gen_salt('bf')),
    now(),
    '{"first_name": "Jane", "last_name": "Doe", "gender": "Female"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  -- User 5
  (
    'b0000005-0000-4000-8000-000000000005',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'michael.johnson@example.com',
    extensions.crypt('password', extensions.gen_salt('bf')),
    now(),
    '{"first_name": "Michael", "last_name": "Johnson", "gender": "Male"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  -- User 6
  (
    'b0000006-0000-4000-8000-000000000006',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'sarah.williams@example.com',
    extensions.crypt('password', extensions.gen_salt('bf')),
    now(),
    '{"first_name": "Sarah", "last_name": "Williams", "gender": "Female"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  -- User 7
  (
    'b0000007-0000-4000-8000-000000000007',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'david.brown@example.com',
    extensions.crypt('password', extensions.gen_salt('bf')),
    now(),
    '{"first_name": "David", "last_name": "Brown", "gender": "Male"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  -- User 8
  (
    'b0000008-0000-4000-8000-000000000008',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'emily.jones@example.com',
    extensions.crypt('password', extensions.gen_salt('bf')),
    now(),
    '{"first_name": "Emily", "last_name": "Jones", "gender": "Female"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  -- User 9
  (
    'b0000009-0000-4000-8000-000000000009',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'james.garcia@example.com',
    extensions.crypt('password', extensions.gen_salt('bf')),
    now(),
    '{"first_name": "James", "last_name": "Garcia", "gender": "Male"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  -- User 10
  (
    'b0000010-0000-4000-8000-000000000010',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'amanda.martinez@example.com',
    extensions.crypt('password', extensions.gen_salt('bf')),
    now(),
    '{"first_name": "Amanda", "last_name": "Martinez", "gender": "Female"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  -- User 11
  (
    'b0000011-0000-4000-8000-000000000011',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'robert.rodriguez@example.com',
    extensions.crypt('password', extensions.gen_salt('bf')),
    now(),
    '{"first_name": "Robert", "last_name": "Rodriguez", "gender": "Male"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  -- User 12
  (
    'b0000012-0000-4000-8000-000000000012',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'jessica.hernandez@example.com',
    extensions.crypt('password', extensions.gen_salt('bf')),
    now(),
    '{"first_name": "Jessica", "last_name": "Hernandez", "gender": "Female"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  -- User 13
  (
    'b0000013-0000-4000-8000-000000000013',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'william.lopez@example.com',
    extensions.crypt('password', extensions.gen_salt('bf')),
    now(),
    '{"first_name": "William", "last_name": "Lopez", "gender": "Male"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  -- User 14
  (
    'b0000014-0000-4000-8000-000000000014',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'ashley.gonzalez@example.com',
    extensions.crypt('password', extensions.gen_salt('bf')),
    now(),
    '{"first_name": "Ashley", "last_name": "Gonzalez", "gender": "Female"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  -- User 15
  (
    'b0000015-0000-4000-8000-000000000015',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'christopher.wilson@example.com',
    extensions.crypt('password', extensions.gen_salt('bf')),
    now(),
    '{"first_name": "Christopher", "last_name": "Wilson", "gender": "Male"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  -- User 16
  (
    'b0000016-0000-4000-8000-000000000016',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'jennifer.anderson@example.com',
    extensions.crypt('password', extensions.gen_salt('bf')),
    now(),
    '{"first_name": "Jennifer", "last_name": "Anderson", "gender": "Female"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  -- User 17
  (
    'b0000017-0000-4000-8000-000000000017',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'matthew.thomas@example.com',
    extensions.crypt('password', extensions.gen_salt('bf')),
    now(),
    '{"first_name": "Matthew", "last_name": "Thomas", "gender": "Male"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  -- User 18
  (
    'b0000018-0000-4000-8000-000000000018',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'stephanie.taylor@example.com',
    extensions.crypt('password', extensions.gen_salt('bf')),
    now(),
    '{"first_name": "Stephanie", "last_name": "Taylor", "gender": "Female"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  -- User 19
  (
    'b0000019-0000-4000-8000-000000000019',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'daniel.moore@example.com',
    extensions.crypt('password', extensions.gen_salt('bf')),
    now(),
    '{"first_name": "Daniel", "last_name": "Moore", "gender": "Male"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  -- User 20
  (
    'b0000020-0000-4000-8000-000000000020',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'michelle.jackson@example.com',
    extensions.crypt('password', extensions.gen_salt('bf')),
    now(),
    '{"first_name": "Michelle", "last_name": "Jackson", "gender": "Female"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  -- User 21
  (
    'b0000021-0000-4000-8000-000000000021',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'andrew.martin@example.com',
    extensions.crypt('password', extensions.gen_salt('bf')),
    now(),
    '{"first_name": "Andrew", "last_name": "Martin", "gender": "Male"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  -- User 22
  (
    'b0000022-0000-4000-8000-000000000022',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'kimberly.lee@example.com',
    extensions.crypt('password', extensions.gen_salt('bf')),
    now(),
    '{"first_name": "Kimberly", "last_name": "Lee", "gender": "Female"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  -- User 23
  (
    'b0000023-0000-4000-8000-000000000023',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'joshua.perez@example.com',
    extensions.crypt('password', extensions.gen_salt('bf')),
    now(),
    '{"first_name": "Joshua", "last_name": "Perez", "gender": "Male"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  -- User 24
  (
    'b0000024-0000-4000-8000-000000000024',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'melissa.thompson@example.com',
    extensions.crypt('password', extensions.gen_salt('bf')),
    now(),
    '{"first_name": "Melissa", "last_name": "Thompson", "gender": "Female"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  -- User 25
  (
    'b0000025-0000-4000-8000-000000000025',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'kevin.white@example.com',
    extensions.crypt('password', extensions.gen_salt('bf')),
    now(),
    '{"first_name": "Kevin", "last_name": "White", "gender": "Male"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  -- User 26
  (
    'b0000026-0000-4000-8000-000000000026',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'laura.harris@example.com',
    extensions.crypt('password', extensions.gen_salt('bf')),
    now(),
    '{"first_name": "Laura", "last_name": "Harris", "gender": "Female"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  -- User 27
  (
    'b0000027-0000-4000-8000-000000000027',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'brian.sanchez@example.com',
    extensions.crypt('password', extensions.gen_salt('bf')),
    now(),
    '{"first_name": "Brian", "last_name": "Sanchez", "gender": "Male"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  -- User 28
  (
    'b0000028-0000-4000-8000-000000000028',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'nicole.clark@example.com',
    extensions.crypt('password', extensions.gen_salt('bf')),
    now(),
    '{"first_name": "Nicole", "last_name": "Clark", "gender": "Female"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  -- User 29
  (
    'b0000029-0000-4000-8000-000000000029',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'ryan.ramirez@example.com',
    extensions.crypt('password', extensions.gen_salt('bf')),
    now(),
    '{"first_name": "Ryan", "last_name": "Ramirez", "gender": "Male"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  -- User 30
  (
    'b0000030-0000-4000-8000-000000000030',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'heather.lewis@example.com',
    extensions.crypt('password', extensions.gen_salt('bf')),
    now(),
    '{"first_name": "Heather", "last_name": "Lewis", "gender": "Female"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  -- User 31
  (
    'b0000031-0000-4000-8000-000000000031',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'justin.robinson@example.com',
    extensions.crypt('password', extensions.gen_salt('bf')),
    now(),
    '{"first_name": "Justin", "last_name": "Robinson", "gender": "Male"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  -- User 32
  (
    'b0000032-0000-4000-8000-000000000032',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'rachel.walker@example.com',
    extensions.crypt('password', extensions.gen_salt('bf')),
    now(),
    '{"first_name": "Rachel", "last_name": "Walker", "gender": "Female"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  -- User 33
  (
    'b0000033-0000-4000-8000-000000000033',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'brandon.young@example.com',
    extensions.crypt('password', extensions.gen_salt('bf')),
    now(),
    '{"first_name": "Brandon", "last_name": "Young", "gender": "Male"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  -- User 34
  (
    'b0000034-0000-4000-8000-000000000034',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'amber.allen@example.com',
    extensions.crypt('password', extensions.gen_salt('bf')),
    now(),
    '{"first_name": "Amber", "last_name": "Allen", "gender": "Female"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  -- User 35
  (
    'b0000035-0000-4000-8000-000000000035',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'tyler.king@example.com',
    extensions.crypt('password', extensions.gen_salt('bf')),
    now(),
    '{"first_name": "Tyler", "last_name": "King", "gender": "Male"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  -- User 36
  (
    'b0000036-0000-4000-8000-000000000036',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'megan.wright@example.com',
    extensions.crypt('password', extensions.gen_salt('bf')),
    now(),
    '{"first_name": "Megan", "last_name": "Wright", "gender": "Female"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  -- User 37
  (
    'b0000037-0000-4000-8000-000000000037',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'aaron.scott@example.com',
    extensions.crypt('password', extensions.gen_salt('bf')),
    now(),
    '{"first_name": "Aaron", "last_name": "Scott", "gender": "Male"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  -- User 38
  (
    'b0000038-0000-4000-8000-000000000038',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'christina.torres@example.com',
    extensions.crypt('password', extensions.gen_salt('bf')),
    now(),
    '{"first_name": "Christina", "last_name": "Torres", "gender": "Female"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  -- User 39
  (
    'b0000039-0000-4000-8000-000000000039',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'adam.nguyen@example.com',
    extensions.crypt('password', extensions.gen_salt('bf')),
    now(),
    '{"first_name": "Adam", "last_name": "Nguyen", "gender": "Male"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  -- User 40
  (
    'b0000040-0000-4000-8000-000000000040',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'samantha.hill@example.com',
    extensions.crypt('password', extensions.gen_salt('bf')),
    now(),
    '{"first_name": "Samantha", "last_name": "Hill", "gender": "Female"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  -- User 41
  (
    'b0000041-0000-4000-8000-000000000041',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'nathan.flores@example.com',
    extensions.crypt('password', extensions.gen_salt('bf')),
    now(),
    '{"first_name": "Nathan", "last_name": "Flores", "gender": "Male"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  -- User 42
  (
    'b0000042-0000-4000-8000-000000000042',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'victoria.green@example.com',
    extensions.crypt('password', extensions.gen_salt('bf')),
    now(),
    '{"first_name": "Victoria", "last_name": "Green", "gender": "Female"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  -- User 43
  (
    'b0000043-0000-4000-8000-000000000043',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'eric.adams@example.com',
    extensions.crypt('password', extensions.gen_salt('bf')),
    now(),
    '{"first_name": "Eric", "last_name": "Adams", "gender": "Male"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  -- User 44
  (
    'b0000044-0000-4000-8000-000000000044',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'tiffany.nelson@example.com',
    extensions.crypt('password', extensions.gen_salt('bf')),
    now(),
    '{"first_name": "Tiffany", "last_name": "Nelson", "gender": "Female"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  -- User 45
  (
    'b0000045-0000-4000-8000-000000000045',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'jacob.baker@example.com',
    extensions.crypt('password', extensions.gen_salt('bf')),
    now(),
    '{"first_name": "Jacob", "last_name": "Baker", "gender": "Male"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  -- User 46
  (
    'b0000046-0000-4000-8000-000000000046',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'brittany.hall@example.com',
    extensions.crypt('password', extensions.gen_salt('bf')),
    now(),
    '{"first_name": "Brittany", "last_name": "Hall", "gender": "Female"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  -- User 47
  (
    'b0000047-0000-4000-8000-000000000047',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'samuel.rivera@example.com',
    extensions.crypt('password', extensions.gen_salt('bf')),
    now(),
    '{"first_name": "Samuel", "last_name": "Rivera", "gender": "Male"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  -- User 48
  (
    'b0000048-0000-4000-8000-000000000048',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'katherine.campbell@example.com',
    extensions.crypt('password', extensions.gen_salt('bf')),
    now(),
    '{"first_name": "Katherine", "last_name": "Campbell", "gender": "Female"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  -- User 49
  (
    'b0000049-0000-4000-8000-000000000049',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'patrick.mitchell@example.com',
    extensions.crypt('password', extensions.gen_salt('bf')),
    now(),
    '{"first_name": "Patrick", "last_name": "Mitchell", "gender": "Male"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  -- User 50
  (
    'b0000050-0000-4000-8000-000000000050',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'elizabeth.carter@example.com',
    extensions.crypt('password', extensions.gen_salt('bf')),
    now(),
    '{"first_name": "Elizabeth", "last_name": "Carter", "gender": "Female"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

-- =============================================================================
-- SECTION: Auth Identities (auth.identities table)
-- =============================================================================
-- Required for Supabase auth to work properly with email/password login

INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
)
SELECT
  id,
  id,
  jsonb_build_object('sub', id::text, 'email', email),
  'email',
  id::text,
  now(),
  now(),
  now()
FROM auth.users;

-- =============================================================================
-- SECTION: User Roles (Assign roles to primary users)
-- =============================================================================
-- Give sdavisde@gmail.com and nick44fierro@gmail.com Full Access

INSERT INTO public.user_roles (user_id, role_id) VALUES
  ('b0000001-0000-4000-8000-000000000001', 'a0000001-0000-4000-8000-000000000001'), -- Sean Davis - Full Access
  ('b0000002-0000-4000-8000-000000000002', 'a0000001-0000-4000-8000-000000000001'); -- Nick Fierro - Full Access

-- =============================================================================
-- SECTION: Update Public Users with Additional Data
-- =============================================================================
-- The sync_users trigger creates basic records, but we can add more detail

UPDATE public.users SET
  phone_number = '555-123-4567',
  church_affiliation = 'First Baptist Church',
  weekend_attended = 'DTTD Mens #42'
WHERE id = 'b0000001-0000-4000-8000-000000000001';

UPDATE public.users SET
  phone_number = '555-234-5678',
  church_affiliation = 'Grace Community Church',
  weekend_attended = 'DTTD Mens #40'
WHERE id = 'b0000002-0000-4000-8000-000000000002';

-- Add some variety to other users
UPDATE public.users SET
  phone_number = numbered.phone,
  church_affiliation = numbered.church,
  weekend_attended = numbered.weekend
FROM (
  SELECT
    id,
    gender,
    '555-' || LPAD((100 + rn)::text, 3, '0') || '-' || LPAD((1000 + rn)::text, 4, '0') AS phone,
    CASE rn % 5
      WHEN 0 THEN 'First Baptist Church'
      WHEN 1 THEN 'Grace Community Church'
      WHEN 2 THEN 'St. Mary''s Catholic Church'
      WHEN 3 THEN 'Trinity Methodist Church'
      WHEN 4 THEN 'Crossroads Bible Church'
    END AS church,
    CASE
      WHEN gender = 'Male' THEN 'DTTD Mens #' || (35 + rn % 10)::text
      ELSE 'DTTD Womens #' || (35 + rn % 10)::text
    END AS weekend
  FROM (
    SELECT id, gender, ROW_NUMBER() OVER () AS rn
    FROM public.users
    WHERE id NOT IN ('b0000001-0000-4000-8000-000000000001', 'b0000002-0000-4000-8000-000000000002')
  ) AS numbered_inner
) AS numbered
WHERE public.users.id = numbered.id;

-- =============================================================================
-- SECTION: Weekends
-- =============================================================================
-- Create 5 weekend groups (10 total records - Men's and Women's for each)
-- 3 past (FINISHED), 1 current (ACTIVE), 1 future (PLANNING)

-- Weekend groups must be inserted before weekends (FK dependency)
-- #42 and #43 have no fees: they predate fee tracking, like DTTD's groups
-- before #12, so outstanding fees skip them.
INSERT INTO public.weekend_groups (id, number, team_fee, candidate_fee, online_surcharge) VALUES
  ('d0000001-0000-4000-8000-000000000001', 42, NULL, NULL, NULL),
  ('d0000002-0000-4000-8000-000000000002', 43, NULL, NULL, NULL),
  ('d0000003-0000-4000-8000-000000000003', 44, 200, 200, 10),
  ('d0000004-0000-4000-8000-000000000004', 45, 200, 200, 10),
  ('d0000005-0000-4000-8000-000000000005', 46, 200, 200, 10);

INSERT INTO public.weekends (id, group_id, type, title, start_date, end_date, status) VALUES
  -- Weekend Group 1: FINISHED (Spring 2024)
  ('c0000001-0000-4000-8000-000000000001', 'd0000001-0000-4000-8000-000000000001', 'MENS', 'DTTD Mens #42', '2024-03-14', '2024-03-17', 'FINISHED'),
  ('c0000002-0000-4000-8000-000000000001', 'd0000001-0000-4000-8000-000000000001', 'WOMENS', 'DTTD Womens #42', '2024-03-14', '2024-03-17', 'FINISHED'),

  -- Weekend Group 2: FINISHED (Fall 2024)
  ('c0000003-0000-4000-8000-000000000002', 'd0000002-0000-4000-8000-000000000002', 'MENS', 'DTTD Mens #43', '2024-09-19', '2024-09-22', 'FINISHED'),
  ('c0000004-0000-4000-8000-000000000002', 'd0000002-0000-4000-8000-000000000002', 'WOMENS', 'DTTD Womens #43', '2024-09-19', '2024-09-22', 'FINISHED'),

  -- Weekend Group 3: FINISHED (Spring 2025)
  ('c0000005-0000-4000-8000-000000000003', 'd0000003-0000-4000-8000-000000000003', 'MENS', 'DTTD Mens #44', '2025-03-13', '2025-03-16', 'FINISHED'),
  ('c0000006-0000-4000-8000-000000000003', 'd0000003-0000-4000-8000-000000000003', 'WOMENS', 'DTTD Womens #44', '2025-03-13', '2025-03-16', 'FINISHED'),

  -- Weekend Group 4: ACTIVE (Fall 2025 - current)
  ('c0000007-0000-4000-8000-000000000004', 'd0000004-0000-4000-8000-000000000004', 'MENS', 'DTTD Mens #45', '2025-09-18', '2025-09-21', 'ACTIVE'),
  ('c0000008-0000-4000-8000-000000000004', 'd0000004-0000-4000-8000-000000000004', 'WOMENS', 'DTTD Womens #45', '2025-09-18', '2025-09-21', 'ACTIVE'),

  -- Weekend Group 5: PLANNING (Spring 2026 - future)
  ('c0000009-0000-4000-8000-000000000005', 'd0000005-0000-4000-8000-000000000005', 'MENS', 'DTTD Mens #46', '2026-03-12', '2026-03-15', 'PLANNING'),
  ('c0000010-0000-4000-8000-000000000005', 'd0000005-0000-4000-8000-000000000005', 'WOMENS', 'DTTD Womens #46', '2026-03-12', '2026-03-15', 'PLANNING');

-- =============================================================================
-- SECTION: Events for DTTD #45
-- =============================================================================
-- Events associated with the active weekend (DTTD #45) for calendar testing
-- Includes various event types and some days with multiple events

INSERT INTO public.events (title, datetime, location, end_datetime, weekend_group_id, type) VALUES
  -- February 2026 events (current month for testing)
  ('Team Meeting', '2026-02-05 19:00:00', 'First Baptist Church', '2026-02-05 21:00:00', 'd0000004-0000-4000-8000-000000000004', 'meeting'),
  ('Prayer Team Gathering', '2026-02-10 18:30:00', 'Community Chapel', '2026-02-10 20:00:00', 'd0000004-0000-4000-8000-000000000004', 'meeting'),
  ('Sponsor Training', '2026-02-15 09:00:00', 'Grace Fellowship Hall', '2026-02-15 12:00:00', 'd0000004-0000-4000-8000-000000000004', 'meeting'),
  ('Women''s Team Meeting', '2026-02-15 14:00:00', 'Grace Fellowship Hall', '2026-02-15 16:00:00', 'd0000004-0000-4000-8000-000000000004', 'meeting'),
  ('Palanca Workshop', '2026-02-20 19:00:00', 'St. Mark''s Parish Hall', '2026-02-20 21:00:00', 'd0000004-0000-4000-8000-000000000004', 'meeting'),

  -- March 2026 events
  ('Combined Team Meeting', '2026-03-07 10:00:00', 'First Baptist Church', '2026-03-07 12:00:00', 'd0000004-0000-4000-8000-000000000004', 'meeting'),
  ('Music Team Practice', '2026-03-14 14:00:00', 'Community Chapel', '2026-03-14 16:00:00', 'd0000004-0000-4000-8000-000000000004', 'other'),
  ('Table Leader Training', '2026-03-14 18:00:00', 'Grace Fellowship Hall', '2026-03-14 20:00:00', 'd0000004-0000-4000-8000-000000000004', 'meeting'),
  ('Serenade Practice', '2026-03-21 15:00:00', 'Community Chapel', '2026-03-21 17:00:00', 'd0000004-0000-4000-8000-000000000004', 'serenade'),
  ('Secuela', '2025-05-25 14:00:00', 'Camp Tejas', '2025-05-25 20:00:00', 'd0000004-0000-4000-8000-000000000004', 'secuela'),

  -- April 2026 events
  ('Rector''s Meeting', '2026-04-04 09:00:00', 'Rector''s Home', '2026-04-04 11:00:00', 'd0000004-0000-4000-8000-000000000004', 'meeting'),
  ('Team Building Day', '2026-04-18 08:00:00', 'Camp Tejas', '2026-04-18 17:00:00', 'd0000004-0000-4000-8000-000000000004', 'other'),
  ('Women''s Team Building', '2026-04-18 08:00:00', 'Camp Tejas', '2026-04-18 17:00:00', 'd0000004-0000-4000-8000-000000000004', 'other'),

  -- May 2026 events (multiple on same days to test stacking)
  ('Men''s Sendoff Planning', '2026-05-09 10:00:00', 'First Baptist Church', '2026-05-09 12:00:00', 'd0000004-0000-4000-8000-000000000004', 'meeting'),
  ('Women''s Sendoff Planning', '2026-05-09 14:00:00', 'First Baptist Church', '2026-05-09 16:00:00', 'd0000004-0000-4000-8000-000000000004', 'meeting'),
  ('Community Prayer Night', '2026-05-09 19:00:00', 'Community Chapel', '2026-05-09 21:00:00', 'd0000004-0000-4000-8000-000000000004', 'other'),
  ('Final Team Meeting', '2026-05-23 09:00:00', 'Grace Fellowship Hall', '2026-05-23 12:00:00', 'd0000004-0000-4000-8000-000000000004', 'meeting'),

  -- Weekend events (September 2026 - the actual weekend)
  ('Men''s Sendoff', '2026-09-17 17:00:00', 'First Baptist Church', '2026-09-17 19:00:00', 'd0000004-0000-4000-8000-000000000004', 'sendoff'),
  ('Women''s Sendoff', '2026-09-17 17:00:00', 'Community Chapel', '2026-09-17 19:00:00', 'd0000004-0000-4000-8000-000000000004', 'sendoff'),
  ('Men''s Weekend', '2026-09-17 19:00:00', 'Camp Tejas', '2026-09-20 15:00:00', 'd0000004-0000-4000-8000-000000000004', 'weekend'),
  ('Women''s Weekend', '2026-09-17 19:00:00', 'Camp Tejas', '2026-09-20 15:00:00', 'd0000004-0000-4000-8000-000000000004', 'weekend'),
  ('Men''s Serenade', '2026-09-19 20:00:00', 'Camp Tejas', '2026-09-19 21:30:00', 'd0000004-0000-4000-8000-000000000004', 'serenade'),
  ('Women''s Serenade', '2026-09-19 20:00:00', 'Camp Tejas', '2026-09-19 21:30:00', 'd0000004-0000-4000-8000-000000000004', 'serenade'),
  ('Men''s Closing', '2026-09-20 14:00:00', 'Camp Tejas', '2026-09-20 16:00:00', 'd0000004-0000-4000-8000-000000000004', 'closing'),
  ('Women''s Closing', '2026-09-20 14:00:00', 'Camp Tejas', '2026-09-20 16:00:00', 'd0000004-0000-4000-8000-000000000004', 'closing');

-- =============================================================================
-- SECTION: Candidates
-- =============================================================================
-- Create candidate records across different weekends with various statuses
-- Historic weekends: 24 candidates per gender (all confirmed)
-- Active weekend: Various statuses with edge cases

-- -----------------------------------------------------------------------------
-- Historic Weekend #42 (Men's) - All confirmed
-- -----------------------------------------------------------------------------
INSERT INTO public.candidates (id, weekend_id, status, created_at, updated_at) VALUES
  ('e0000001-0000-4000-8000-000000000001', 'c0000001-0000-4000-8000-000000000001', 'confirmed', '2024-02-01', '2024-03-01'),
  ('e0000002-0000-4000-8000-000000000002', 'c0000001-0000-4000-8000-000000000001', 'confirmed', '2024-02-02', '2024-03-01'),
  ('e0000003-0000-4000-8000-000000000003', 'c0000001-0000-4000-8000-000000000001', 'confirmed', '2024-02-03', '2024-03-01'),
  ('e0000004-0000-4000-8000-000000000004', 'c0000001-0000-4000-8000-000000000001', 'confirmed', '2024-02-04', '2024-03-01'),
  ('e0000005-0000-4000-8000-000000000005', 'c0000001-0000-4000-8000-000000000001', 'confirmed', '2024-02-05', '2024-03-01'),
  ('e0000006-0000-4000-8000-000000000006', 'c0000001-0000-4000-8000-000000000001', 'confirmed', '2024-02-06', '2024-03-01'),
  ('e0000007-0000-4000-8000-000000000007', 'c0000001-0000-4000-8000-000000000001', 'confirmed', '2024-02-07', '2024-03-01'),
  ('e0000008-0000-4000-8000-000000000008', 'c0000001-0000-4000-8000-000000000001', 'confirmed', '2024-02-08', '2024-03-01'),
  ('e0000009-0000-4000-8000-000000000009', 'c0000001-0000-4000-8000-000000000001', 'confirmed', '2024-02-09', '2024-03-01'),
  ('e0000010-0000-4000-8000-000000000010', 'c0000001-0000-4000-8000-000000000001', 'confirmed', '2024-02-10', '2024-03-01'),
  ('e0000011-0000-4000-8000-000000000011', 'c0000001-0000-4000-8000-000000000001', 'confirmed', '2024-02-11', '2024-03-01'),
  ('e0000012-0000-4000-8000-000000000012', 'c0000001-0000-4000-8000-000000000001', 'confirmed', '2024-02-12', '2024-03-01'),
  ('e0000013-0000-4000-8000-000000000013', 'c0000001-0000-4000-8000-000000000001', 'confirmed', '2024-02-13', '2024-03-01'),
  ('e0000014-0000-4000-8000-000000000014', 'c0000001-0000-4000-8000-000000000001', 'confirmed', '2024-02-14', '2024-03-01'),
  ('e0000015-0000-4000-8000-000000000015', 'c0000001-0000-4000-8000-000000000001', 'confirmed', '2024-02-15', '2024-03-01'),
  ('e0000016-0000-4000-8000-000000000016', 'c0000001-0000-4000-8000-000000000001', 'confirmed', '2024-02-16', '2024-03-01'),
  ('e0000017-0000-4000-8000-000000000017', 'c0000001-0000-4000-8000-000000000001', 'confirmed', '2024-02-17', '2024-03-01'),
  ('e0000018-0000-4000-8000-000000000018', 'c0000001-0000-4000-8000-000000000001', 'confirmed', '2024-02-18', '2024-03-01'),
  ('e0000019-0000-4000-8000-000000000019', 'c0000001-0000-4000-8000-000000000001', 'confirmed', '2024-02-19', '2024-03-01'),
  ('e0000020-0000-4000-8000-000000000020', 'c0000001-0000-4000-8000-000000000001', 'confirmed', '2024-02-20', '2024-03-01'),
  ('e0000021-0000-4000-8000-000000000021', 'c0000001-0000-4000-8000-000000000001', 'confirmed', '2024-02-21', '2024-03-01'),
  ('e0000022-0000-4000-8000-000000000022', 'c0000001-0000-4000-8000-000000000001', 'confirmed', '2024-02-22', '2024-03-01'),
  ('e0000023-0000-4000-8000-000000000023', 'c0000001-0000-4000-8000-000000000001', 'confirmed', '2024-02-23', '2024-03-01'),
  ('e0000024-0000-4000-8000-000000000024', 'c0000001-0000-4000-8000-000000000001', 'confirmed', '2024-02-24', '2024-03-01');

-- -----------------------------------------------------------------------------
-- Historic Weekend #42 (Women's) - All confirmed
-- -----------------------------------------------------------------------------
INSERT INTO public.candidates (id, weekend_id, status, created_at, updated_at) VALUES
  ('e0000025-0000-4000-8000-000000000025', 'c0000002-0000-4000-8000-000000000001', 'confirmed', '2024-02-01', '2024-03-01'),
  ('e0000026-0000-4000-8000-000000000026', 'c0000002-0000-4000-8000-000000000001', 'confirmed', '2024-02-02', '2024-03-01'),
  ('e0000027-0000-4000-8000-000000000027', 'c0000002-0000-4000-8000-000000000001', 'confirmed', '2024-02-03', '2024-03-01'),
  ('e0000028-0000-4000-8000-000000000028', 'c0000002-0000-4000-8000-000000000001', 'confirmed', '2024-02-04', '2024-03-01'),
  ('e0000029-0000-4000-8000-000000000029', 'c0000002-0000-4000-8000-000000000001', 'confirmed', '2024-02-05', '2024-03-01'),
  ('e0000030-0000-4000-8000-000000000030', 'c0000002-0000-4000-8000-000000000001', 'confirmed', '2024-02-06', '2024-03-01'),
  ('e0000031-0000-4000-8000-000000000031', 'c0000002-0000-4000-8000-000000000001', 'confirmed', '2024-02-07', '2024-03-01'),
  ('e0000032-0000-4000-8000-000000000032', 'c0000002-0000-4000-8000-000000000001', 'confirmed', '2024-02-08', '2024-03-01'),
  ('e0000033-0000-4000-8000-000000000033', 'c0000002-0000-4000-8000-000000000001', 'confirmed', '2024-02-09', '2024-03-01'),
  ('e0000034-0000-4000-8000-000000000034', 'c0000002-0000-4000-8000-000000000001', 'confirmed', '2024-02-10', '2024-03-01'),
  ('e0000035-0000-4000-8000-000000000035', 'c0000002-0000-4000-8000-000000000001', 'confirmed', '2024-02-11', '2024-03-01'),
  ('e0000036-0000-4000-8000-000000000036', 'c0000002-0000-4000-8000-000000000001', 'confirmed', '2024-02-12', '2024-03-01'),
  ('e0000037-0000-4000-8000-000000000037', 'c0000002-0000-4000-8000-000000000001', 'confirmed', '2024-02-13', '2024-03-01'),
  ('e0000038-0000-4000-8000-000000000038', 'c0000002-0000-4000-8000-000000000001', 'confirmed', '2024-02-14', '2024-03-01'),
  ('e0000039-0000-4000-8000-000000000039', 'c0000002-0000-4000-8000-000000000001', 'confirmed', '2024-02-15', '2024-03-01'),
  ('e0000040-0000-4000-8000-000000000040', 'c0000002-0000-4000-8000-000000000001', 'confirmed', '2024-02-16', '2024-03-01'),
  ('e0000041-0000-4000-8000-000000000041', 'c0000002-0000-4000-8000-000000000001', 'confirmed', '2024-02-17', '2024-03-01'),
  ('e0000042-0000-4000-8000-000000000042', 'c0000002-0000-4000-8000-000000000001', 'confirmed', '2024-02-18', '2024-03-01'),
  ('e0000043-0000-4000-8000-000000000043', 'c0000002-0000-4000-8000-000000000001', 'confirmed', '2024-02-19', '2024-03-01'),
  ('e0000044-0000-4000-8000-000000000044', 'c0000002-0000-4000-8000-000000000001', 'confirmed', '2024-02-20', '2024-03-01'),
  ('e0000045-0000-4000-8000-000000000045', 'c0000002-0000-4000-8000-000000000001', 'confirmed', '2024-02-21', '2024-03-01'),
  ('e0000046-0000-4000-8000-000000000046', 'c0000002-0000-4000-8000-000000000001', 'confirmed', '2024-02-22', '2024-03-01'),
  ('e0000047-0000-4000-8000-000000000047', 'c0000002-0000-4000-8000-000000000001', 'confirmed', '2024-02-23', '2024-03-01'),
  ('e0000048-0000-4000-8000-000000000048', 'c0000002-0000-4000-8000-000000000001', 'confirmed', '2024-02-24', '2024-03-01');

-- -----------------------------------------------------------------------------
-- Active Weekend #45 (Men's) - Various statuses with edge cases
-- -----------------------------------------------------------------------------
INSERT INTO public.candidates (id, weekend_id, status, created_at, updated_at) VALUES
  -- Confirmed candidates (10)
  ('e1000100-0000-4000-8000-000000000100', 'c0000007-0000-4000-8000-000000000004', 'confirmed', '2025-06-01', '2025-08-01'),
  ('e1000101-0000-4000-8000-000000000101', 'c0000007-0000-4000-8000-000000000004', 'confirmed', '2025-06-02', '2025-08-02'),
  ('e1000102-0000-4000-8000-000000000102', 'c0000007-0000-4000-8000-000000000004', 'confirmed', '2025-06-03', '2025-08-03'),
  ('e1000103-0000-4000-8000-000000000103', 'c0000007-0000-4000-8000-000000000004', 'confirmed', '2025-06-04', '2025-08-04'),
  ('e1000104-0000-4000-8000-000000000104', 'c0000007-0000-4000-8000-000000000004', 'confirmed', '2025-06-05', '2025-08-05'),
  ('e1000105-0000-4000-8000-000000000105', 'c0000007-0000-4000-8000-000000000004', 'confirmed', '2025-06-06', '2025-08-06'),
  ('e1000106-0000-4000-8000-000000000106', 'c0000007-0000-4000-8000-000000000004', 'confirmed', '2025-06-07', '2025-08-07'),
  ('e1000107-0000-4000-8000-000000000107', 'c0000007-0000-4000-8000-000000000004', 'confirmed', '2025-06-08', '2025-08-08'),
  ('e1000108-0000-4000-8000-000000000108', 'c0000007-0000-4000-8000-000000000004', 'confirmed', '2025-06-09', '2025-08-09'),
  ('e1000109-0000-4000-8000-000000000109', 'c0000007-0000-4000-8000-000000000004', 'confirmed', '2025-06-10', '2025-08-10'),

  -- Awaiting payment (3)
  ('e1000110-0000-4000-8000-000000000110', 'c0000007-0000-4000-8000-000000000004', 'awaiting_payment', '2025-07-01', '2025-07-20'),
  ('e1000111-0000-4000-8000-000000000111', 'c0000007-0000-4000-8000-000000000004', 'awaiting_payment', '2025-07-02', '2025-07-21'),
  ('e1000112-0000-4000-8000-000000000112', 'c0000007-0000-4000-8000-000000000004', 'awaiting_payment', '2025-07-03', '2025-07-22'),

  -- Awaiting forms (4)
  ('e1000113-0000-4000-8000-000000000113', 'c0000007-0000-4000-8000-000000000004', 'awaiting_forms', '2025-07-10', '2025-07-15'),
  ('e1000114-0000-4000-8000-000000000114', 'c0000007-0000-4000-8000-000000000004', 'awaiting_forms', '2025-07-11', '2025-07-16'),
  ('e1000115-0000-4000-8000-000000000115', 'c0000007-0000-4000-8000-000000000004', 'awaiting_forms', '2025-07-12', '2025-07-17'),
  ('e1000116-0000-4000-8000-000000000116', 'c0000007-0000-4000-8000-000000000004', 'awaiting_forms', '2025-07-13', '2025-07-18'),

  -- Pending approval (forms completed, awaiting review) (2)
  ('e1000140-0000-4000-8000-000000000140', 'c0000007-0000-4000-8000-000000000004', 'pending_approval', '2025-07-05', '2025-07-25'),
  ('e1000141-0000-4000-8000-000000000141', 'c0000007-0000-4000-8000-000000000004', 'pending_approval', '2025-07-06', '2025-07-26'),

  -- Sponsored (just sponsored, no forms sent yet) (3)
  ('e1000117-0000-4000-8000-000000000117', 'c0000007-0000-4000-8000-000000000004', 'sponsored', '2025-08-01', '2025-08-01'),
  ('e1000118-0000-4000-8000-000000000118', 'c0000007-0000-4000-8000-000000000004', 'sponsored', '2025-08-02', '2025-08-02'),
  ('e1000119-0000-4000-8000-000000000119', 'c0000007-0000-4000-8000-000000000004', 'sponsored', '2025-08-03', '2025-08-03'),

  -- Rejected (2)
  ('e1000120-0000-4000-8000-000000000120', 'c0000007-0000-4000-8000-000000000004', 'rejected', '2025-06-15', '2025-06-20'),
  ('e1000121-0000-4000-8000-000000000121', 'c0000007-0000-4000-8000-000000000004', 'rejected', '2025-06-16', '2025-06-21');

-- -----------------------------------------------------------------------------
-- Active Weekend #45 (Women's) - Various statuses with edge cases
-- -----------------------------------------------------------------------------
INSERT INTO public.candidates (id, weekend_id, status, created_at, updated_at) VALUES
  -- Confirmed candidates (8)
  ('e1000122-0000-4000-8000-000000000122', 'c0000008-0000-4000-8000-000000000004', 'confirmed', '2025-06-01', '2025-08-01'),
  ('e1000123-0000-4000-8000-000000000123', 'c0000008-0000-4000-8000-000000000004', 'confirmed', '2025-06-02', '2025-08-02'),
  ('e1000124-0000-4000-8000-000000000124', 'c0000008-0000-4000-8000-000000000004', 'confirmed', '2025-06-03', '2025-08-03'),
  ('e1000125-0000-4000-8000-000000000125', 'c0000008-0000-4000-8000-000000000004', 'confirmed', '2025-06-04', '2025-08-04'),
  ('e1000126-0000-4000-8000-000000000126', 'c0000008-0000-4000-8000-000000000004', 'confirmed', '2025-06-05', '2025-08-05'),
  ('e1000127-0000-4000-8000-000000000127', 'c0000008-0000-4000-8000-000000000004', 'confirmed', '2025-06-06', '2025-08-06'),
  ('e1000128-0000-4000-8000-000000000128', 'c0000008-0000-4000-8000-000000000004', 'confirmed', '2025-06-07', '2025-08-07'),
  ('e1000129-0000-4000-8000-000000000129', 'c0000008-0000-4000-8000-000000000004', 'confirmed', '2025-06-08', '2025-08-08'),

  -- Awaiting payment (2)
  ('e1000130-0000-4000-8000-000000000130', 'c0000008-0000-4000-8000-000000000004', 'awaiting_payment', '2025-07-01', '2025-07-20'),
  ('e1000131-0000-4000-8000-000000000131', 'c0000008-0000-4000-8000-000000000004', 'awaiting_payment', '2025-07-02', '2025-07-21'),

  -- Awaiting forms (3)
  ('e1000132-0000-4000-8000-000000000132', 'c0000008-0000-4000-8000-000000000004', 'awaiting_forms', '2025-07-10', '2025-07-15'),
  ('e1000133-0000-4000-8000-000000000133', 'c0000008-0000-4000-8000-000000000004', 'awaiting_forms', '2025-07-11', '2025-07-16'),
  ('e1000134-0000-4000-8000-000000000134', 'c0000008-0000-4000-8000-000000000004', 'awaiting_forms', '2025-07-12', '2025-07-17'),

  -- Pending approval (forms completed, awaiting review) (2)
  ('e1000142-0000-4000-8000-000000000142', 'c0000008-0000-4000-8000-000000000004', 'pending_approval', '2025-07-07', '2025-07-27'),
  ('e1000143-0000-4000-8000-000000000143', 'c0000008-0000-4000-8000-000000000004', 'pending_approval', '2025-07-08', '2025-07-28'),

  -- Sponsored (4)
  ('e1000135-0000-4000-8000-000000000135', 'c0000008-0000-4000-8000-000000000004', 'sponsored', '2025-08-01', '2025-08-01'),
  ('e1000136-0000-4000-8000-000000000136', 'c0000008-0000-4000-8000-000000000004', 'sponsored', '2025-08-02', '2025-08-02'),
  ('e1000137-0000-4000-8000-000000000137', 'c0000008-0000-4000-8000-000000000004', 'sponsored', '2025-08-03', '2025-08-03'),
  ('e1000138-0000-4000-8000-000000000138', 'c0000008-0000-4000-8000-000000000004', 'sponsored', '2025-08-04', '2025-08-04'),

  -- Rejected (1)
  ('e1000139-0000-4000-8000-000000000139', 'c0000008-0000-4000-8000-000000000004', 'rejected', '2025-06-15', '2025-06-20');

-- =============================================================================
-- SECTION: Candidate Sponsorship Info (abbreviated - just key edge cases for active weekend)
-- =============================================================================

-- Men's Active Weekend - Sample sponsorship info for different statuses
INSERT INTO public.candidate_sponsorship_info (
  id, candidate_id, candidate_name, candidate_email, sponsor_name, sponsor_email, sponsor_phone,
  sponsor_church, sponsor_weekend, contact_frequency, home_environment,
  god_evidence, support_plan, payment_owner, created_at
) VALUES
  -- Confirmed
  ('f1000100-0000-4000-8000-000000000100', 'e1000100-0000-4000-8000-000000000100',
    'Marcus Thompson', 'marcus.thompson@example.com', 'John Smith', 'john.smith@example.com', '555-123-4567',
    'First Baptist Church', 'DTTD Mens #40', 'Monthly', 'Married with 2 children',
    'Shows interest in deepening faith', 'Weekly check-ins', 'john.smith@example.com', '2025-06-01'),
  -- Awaiting payment
  ('f1000110-0000-4000-8000-000000000110', 'e1000110-0000-4000-8000-000000000110',
    'James Wilson', 'james.wilson@example.com', 'Robert Rodriguez', 'robert.rodriguez@example.com', '555-456-7890',
    'Trinity Methodist Church', 'DTTD Mens #41', 'Monthly', 'Married, expecting first child',
    'Wants to be godly father', 'Weekly coffee', 'robert.rodriguez@example.com', '2025-07-01'),
  -- Awaiting forms
  ('f1000113-0000-4000-8000-000000000113', 'e1000113-0000-4000-8000-000000000113',
    'Thomas Anderson', 'thomas.anderson@example.com', 'James Garcia', 'james.garcia@example.com', '555-567-8901',
    'Crossroads Bible Church', 'DTTD Mens #40', 'Weekly', 'Widower, grieving',
    'Searching for renewed purpose', 'Regular contact', 'james.garcia@example.com', '2025-07-10'),
  -- Pending approval (forms completed, awaiting review)
  ('f1000140-0000-4000-8000-000000000140', 'e1000140-0000-4000-8000-000000000140',
    'Michael Rivera', 'michael.rivera@example.com', 'David Brown', 'david.brown@example.com', '555-140-0001',
    'First Baptist Church', 'DTTD Mens #42', 'Weekly', 'Married with 3 children',
    'Actively seeking deeper faith', 'Weekly discipleship meetings', 'david.brown@example.com', '2025-07-05'),
  ('f1000141-0000-4000-8000-000000000141', 'e1000141-0000-4000-8000-000000000141',
    'Christopher Lee', 'christopher.lee@example.com', 'William Lopez', 'william.lopez@example.com', '555-141-0002',
    'Grace Community Church', 'DTTD Mens #43', 'Bi-weekly', 'Single, career focused',
    'Wants balance between faith and work', 'Regular check-ins', 'william.lopez@example.com', '2025-07-06'),
  -- Sponsored
  ('f1000117-0000-4000-8000-000000000117', 'e1000117-0000-4000-8000-000000000117',
    'Daniel Park', 'daniel.park@example.com', 'Christopher Wilson', 'christopher.wilson@example.com', '555-789-0123',
    'Grace Community Church', 'DTTD Mens #41', 'Bi-weekly', 'Engaged, getting married next year',
    'Seeking spiritual foundation for marriage', 'Flexible meetings', 'christopher.wilson@example.com', '2025-08-01'),
  -- Rejected
  ('f1000120-0000-4000-8000-000000000120', 'e1000120-0000-4000-8000-000000000120',
    'Todd Harrison', 'todd.harrison@example.com', 'Patrick Mitchell', 'patrick.mitchell@example.com', '555-999-0001',
    'Grace Community Church', 'DTTD Mens #41', 'Rarely', 'Unstable living situation',
    'Seems motivated by free weekend', 'Would meet weekly if approved', 'patrick.mitchell@example.com', '2025-06-15');

-- Women's Active Weekend - Sample sponsorship info
INSERT INTO public.candidate_sponsorship_info (
  id, candidate_id, candidate_name, candidate_email, sponsor_name, sponsor_email, sponsor_phone,
  sponsor_church, sponsor_weekend, contact_frequency, home_environment,
  god_evidence, support_plan, payment_owner, created_at
) VALUES
  -- Confirmed
  ('f1000122-0000-4000-8000-000000000122', 'e1000122-0000-4000-8000-000000000122',
    'Jennifer Adams', 'jennifer.adams@example.com', 'Sarah Williams', 'sarah.williams@example.com', '555-111-2222',
    'First Baptist Church', 'DTTD Womens #40', 'Monthly', 'Married, homeschools 4 children',
    'Deep faith but overwhelmed', 'Respite care and prayer', 'sarah.williams@example.com', '2025-06-01'),
  -- Awaiting payment
  ('f1000130-0000-4000-8000-000000000130', 'e1000130-0000-4000-8000-000000000130',
    'Patricia Moore', 'patricia.moore@example.com', 'Jessica Hernandez', 'jessica.hernandez@example.com', '555-444-5555',
    'Crossroads Bible Church', 'DTTD Womens #41', 'Monthly', 'Single, never married, age 45',
    'Trusting God with marriage desire', 'Walk with her in trust', 'jessica.hernandez@example.com', '2025-07-01'),
  -- Awaiting forms
  ('f1000132-0000-4000-8000-000000000132', 'e1000132-0000-4000-8000-000000000132',
    'Karen Taylor', 'karen.taylor@example.com', 'Stephanie Taylor', 'stephanie.taylor@example.com', '555-555-6666',
    'Trinity Methodist Church', 'DTTD Womens #40', 'Weekly', 'Widow, processing grief',
    'Seeking joy again', 'Grief support', 'stephanie.taylor@example.com', '2025-07-10'),
  -- Pending approval (forms completed, awaiting review)
  ('f1000142-0000-4000-8000-000000000142', 'e1000142-0000-4000-8000-000000000142',
    'Rebecca Martinez', 'rebecca.martinez@example.com', 'Emily Jones', 'emily.jones@example.com', '555-142-0003',
    'Crossroads Bible Church', 'DTTD Womens #42', 'Weekly', 'Married, empty nester',
    'Rediscovering purpose after kids left', 'Prayer and coffee meetings', 'emily.jones@example.com', '2025-07-07'),
  ('f1000143-0000-4000-8000-000000000143', 'e1000143-0000-4000-8000-000000000143',
    'Lauren Thompson', 'lauren.thompson@example.com', 'Amanda Martinez', 'amanda.martinez@example.com', '555-143-0004',
    'First Baptist Church', 'DTTD Womens #43', 'Monthly', 'Divorced, rebuilding life',
    'Seeking God in new chapter', 'Support through transition', 'amanda.martinez@example.com', '2025-07-08'),
  -- Sponsored
  ('f1000135-0000-4000-8000-000000000135', 'e1000135-0000-4000-8000-000000000135',
    'Angela White', 'angela.white@example.com', 'Ashley Gonzalez', 'ashley.gonzalez@example.com', '555-777-8888',
    'Grace Community Church', 'DTTD Womens #41', 'Bi-weekly', 'Single mom, 2 kids, financially struggling',
    'Wants faith foundation for kids', 'Childcare and financial help', 'ashley.gonzalez@example.com', '2025-08-01'),
  -- Rejected
  ('f1000139-0000-4000-8000-000000000139', 'e1000139-0000-4000-8000-000000000139',
    'Melissa Ford', 'melissa.ford@example.com', 'Katherine Campbell', 'katherine.campbell@example.com', '555-999-0003',
    'Trinity Methodist Church', 'DTTD Womens #41', 'Rarely', 'Recently separated, very angry',
    'Resistant and bitter', 'Would support but not receptive', 'katherine.campbell@example.com', '2025-06-15');


-- =============================================================================
-- SECTION: Candidate Info (Completed Forms - confirmed, awaiting_payment, & pending_approval)
-- =============================================================================

-- Men's Active Weekend - Confirmed candidates with edge case variations
INSERT INTO public.candidate_info (
  id, candidate_id, first_name, last_name, email, phone, date_of_birth, age,
  address_line_1, city, state, zip, church, marital_status, spouse_name,
  has_spouse_attended_weekend, spouse_weekend_location, is_christian, member_of_clergy,
  has_friends_attending_weekend, reason_for_attending, emergency_contact_name,
  emergency_contact_phone, medical_conditions, shirt_size, created_at
) VALUES
  -- Married with spouse who attended
  ('a1000100-0000-0001-8000-000000000100', 'e1000100-0000-4000-8000-000000000100',
    'Marcus', 'Thompson', 'marcus.thompson@example.com', '555-100-0001', '1985-03-15', 39,
    '1234 Desert View Dr', 'Phoenix', 'AZ', '85001', 'First Baptist Church', 'Married', 'Sarah Thompson',
    true, 'DTTD Womens #38', true, false, true,
    'Want to deepen my faith and be a better husband and father. My wife had an amazing experience.',
    'Sarah Thompson', '555-100-0002', 'High blood pressure (controlled with medication)', 'L', '2025-07-15'),
  -- Single, never married
  ('a1000101-0000-0001-8000-000000000101', 'e1000101-0000-4000-8000-000000000101',
    'David', 'Chen', 'david.chen@example.com', '555-100-0003', '1992-11-22', 32,
    '5678 Mountain Ridge Ln', 'Phoenix', 'AZ', '85002', 'Grace Community Church', 'Single', NULL,
    false, NULL, true, false, false,
    'Seeking deeper relationship with Christ and authentic faith.',
    'Linda Chen (Mother)', '555-100-0004', 'None', 'M', '2025-07-16'),
  -- Divorced with medical conditions
  ('a1000102-0000-0001-8000-000000000102', 'e1000102-0000-4000-8000-000000000102',
    'Robert', 'Martinez', 'robert.martinez@example.com', '555-100-0005', '1978-07-08', 46,
    '9012 Canyon Creek Rd', 'Phoenix', 'AZ', '85003', 'St. Mary''s Catholic Church', 'Divorced', NULL,
    false, NULL, true, false, false,
    'Going through difficult time after divorce. Looking for healing and God''s plan.',
    'Maria Martinez (Sister)', '555-100-0006', 'Type 2 Diabetes (diet controlled), previous knee surgery', 'XL', '2025-07-17'),
  -- Not yet Christian (exploring faith)
  ('a1000103-0000-0001-8000-000000000103', 'e1000103-0000-4000-8000-000000000103',
    'Anthony', 'Baker', 'anthony.baker@example.com', '555-100-0007', '1995-01-30', 29,
    '3456 Sunset Valley Way', 'Phoenix', 'AZ', '85004', 'Trinity Methodist Church', 'Single', NULL,
    NULL, NULL, false, false, false,
    'Raised in church but walked away. Started attending again, want to explore if Christianity is true.',
    'Richard Baker (Father)', '555-100-0008', 'Asthma (uses inhaler)', 'L', '2025-07-18'),
  -- Member of clergy
  ('a1000104-0000-0001-8000-000000000104', 'e1000104-0000-4000-8000-000000000104',
    'Steven', 'Foster', 'steven.foster@example.com', '555-100-0009', '1980-09-12', 44,
    '7890 Palm Springs Dr', 'Phoenix', 'AZ', '85005', 'Crossroads Bible Church', 'Married', 'Rachel Foster',
    false, NULL, true, true, false,
    'Associate pastor wanting to experience this retreat and deepen my own walk.',
    'Rachel Foster', '555-100-0010', 'None', 'M', '2025-07-19'),
  -- Widowed with mental health treatment
  ('a1000105-0000-0001-8000-000000000105', 'e1000105-0000-4000-8000-000000000105',
    'Gregory', 'Walsh', 'gregory.walsh@example.com', '555-100-0011', '1988-05-25', 36,
    '2468 Cactus Flower Ct', 'Phoenix', 'AZ', '85006', 'First Baptist Church', 'Widowed', NULL,
    false, NULL, true, false, true,
    'Wife passed 18 months ago. Friend says this helped him. Need spiritual refreshment.',
    'Thomas Walsh (Brother)', '555-100-0012', 'Depression (in treatment with therapist and medication)', 'L', '2025-07-20'),
  -- Older candidate, previous health issues
  ('a1000106-0000-0001-8000-000000000106', 'e1000106-0000-4000-8000-000000000106',
    'Raymond', 'Cooper', 'raymond.cooper@example.com', '555-100-0013', '1970-12-03', 54,
    '1357 Adobe Trail', 'Phoenix', 'AZ', '85007', 'Grace Community Church', 'Married', 'Patricia Cooper',
    true, 'DTTD Womens #44', true, false, false,
    'Wife attended and came back transformed. Want to experience same and grow together.',
    'Patricia Cooper', '555-100-0014', 'High cholesterol, previous heart attack (3 years ago, recovered)', 'XL', '2025-07-21'),
  -- Engaged couple
  ('a1000107-0000-0001-8000-000000000107', 'e1000107-0000-4000-8000-000000000107',
    'Philip', 'Hughes', 'philip.hughes@example.com', '555-100-0015', '1998-08-17', 26,
    '8024 Saguaro Heights', 'Phoenix', 'AZ', '85008', 'Trinity Methodist Church', 'Engaged', 'Emma Collins',
    false, NULL, true, false, true,
    'Getting married next summer. Want spiritual foundation for marriage. Friends also attending.',
    'Emma Collins (Fiancée)', '555-100-0016', 'None', 'M', '2025-07-22'),
  -- Separated (marital crisis)
  ('a1000108-0000-0001-8000-000000000108', 'e1000108-0000-4000-8000-000000000108',
    'Dennis', 'Murray', 'dennis.murray@example.com', '555-100-0017', '1975-04-20', 49,
    '4681 Red Rock Ave', 'Phoenix', 'AZ', '85009', 'Crossroads Bible Church', 'Separated', NULL,
    NULL, NULL, true, false, false,
    'Wife and I separated. Trying to save marriage. Pastor recommended this.',
    'Frank Murray (Brother)', '555-100-0018', 'Back pain (chronic, manages with PT)', 'L', '2025-07-23'),
  -- Dietary restrictions
  ('a1000109-0000-0001-8000-000000000109', 'e1000109-0000-4000-8000-000000000109',
    'Gerald', 'Dixon', 'gerald.dixon@example.com', '555-100-0019', '1982-10-11', 42,
    '3690 Copper Ridge Rd', 'Phoenix', 'AZ', '85010', 'St. Mary''s Catholic Church', 'Married', 'Catherine Dixon',
    false, NULL, true, false, false,
    'Feeling spiritually dry despite being active. Want to reignite passion for Christ.',
    'Catherine Dixon', '555-100-0020', 'Lactose intolerant, gluten sensitive', 'XL', '2025-07-24');

-- Men's Active Weekend - Awaiting payment (forms completed)
INSERT INTO public.candidate_info (
  id, candidate_id, first_name, last_name, email, phone, date_of_birth, age,
  address_line_1, city, state, zip, church, marital_status, spouse_name,
  is_christian, member_of_clergy, has_friends_attending_weekend, reason_for_attending,
  emergency_contact_name, emergency_contact_phone, medical_conditions, shirt_size, created_at
) VALUES
  ('a1000110-0000-0001-8000-000000000110', 'e1000110-0000-4000-8000-000000000110',
    'James', 'Wilson', 'james.wilson@example.com', '555-100-0021', '1990-06-14', 34,
    '7531 Desert Bloom Dr', 'Phoenix', 'AZ', '85011', 'Trinity Methodist Church', 'Married', 'Jessica Wilson',
    true, false, false, 'About to be a father. Want to grow spiritually to lead family well.',
    'Jessica Wilson', '555-100-0022', 'None', 'M', '2025-07-25');

-- Men's Active Weekend - Pending approval (forms completed, awaiting review)
INSERT INTO public.candidate_info (
  id, candidate_id, first_name, last_name, email, phone, date_of_birth, age,
  address_line_1, city, state, zip, church, marital_status, spouse_name,
  is_christian, member_of_clergy, has_friends_attending_weekend, reason_for_attending,
  emergency_contact_name, emergency_contact_phone, medical_conditions, shirt_size, created_at
) VALUES
  ('a1000140-0000-0001-8000-000000000140', 'e1000140-0000-4000-8000-000000000140',
    'Michael', 'Rivera', 'michael.rivera@example.com', '555-140-0005', '1983-02-18', 41,
    '2847 Mesa View Dr', 'Phoenix', 'AZ', '85012', 'First Baptist Church', 'Married', 'Christina Rivera',
    true, false, true, 'Want to strengthen my faith and be a better spiritual leader for my family.',
    'Christina Rivera', '555-140-0006', 'None', 'L', '2025-07-25'),
  ('a1000141-0000-0001-8000-000000000141', 'e1000141-0000-4000-8000-000000000141',
    'Christopher', 'Lee', 'christopher.lee@example.com', '555-141-0007', '1991-09-05', 33,
    '5123 Canyon Pass Rd', 'Phoenix', 'AZ', '85013', 'Grace Community Church', 'Single', NULL,
    true, false, false, 'Successful career but feeling spiritually empty. Seeking purpose beyond work.',
    'Susan Lee (Mother)', '555-141-0008', 'Mild anxiety (managed without medication)', 'M', '2025-07-26');

-- Women's Active Weekend - Confirmed with edge cases
INSERT INTO public.candidate_info (
  id, candidate_id, first_name, last_name, email, phone, date_of_birth, age,
  address_line_1, city, state, zip, church, marital_status, spouse_name,
  has_spouse_attended_weekend, spouse_weekend_location, is_christian, member_of_clergy,
  has_friends_attending_weekend, reason_for_attending, emergency_contact_name,
  emergency_contact_phone, medical_conditions, shirt_size, created_at
) VALUES
  -- Overwhelmed mom
  ('a1000122-0000-0001-8000-000000000122', 'e1000122-0000-4000-8000-000000000122',
    'Jennifer', 'Adams', 'jennifer.adams@example.com', '555-200-0001', '1987-02-28', 37,
    '2583 Morning Glory Ln', 'Phoenix', 'AZ', '85012', 'First Baptist Church', 'Married', 'Daniel Adams',
    true, 'DTTD Mens #43', true, false, true,
    'Homeschooling mom of four feeling overwhelmed. Need to remember identity beyond "mom".',
    'Daniel Adams', '555-200-0002', 'Anxiety (in treatment), migraines', 'M', '2025-07-26'),
  -- Blended family
  ('a1000123-0000-0001-8000-000000000123', 'e1000123-0000-4000-8000-000000000123',
    'Lisa', 'Robinson', 'lisa.robinson@example.com', '555-200-0003', '1983-11-09', 41,
    '9247 Twilight Vista Dr', 'Phoenix', 'AZ', '85013', 'Grace Community Church', 'Married', 'Mark Robinson',
    false, NULL, true, false, false,
    'Recently remarried with blended family. Strengthen marriage with Christ at center.',
    'Mark Robinson', '555-200-0004', 'None', 'L', '2025-07-27'),
  -- Empty nester
  ('a1000124-0000-0001-8000-000000000124', 'e1000124-0000-4000-8000-000000000124',
    'Susan', 'Clark', 'susan.clark@example.com', '555-200-0005', '1965-07-16', 59,
    '4826 Whispering Pines Way', 'Phoenix', 'AZ', '85014', 'St. Mary''s Catholic Church', 'Married', 'George Clark',
    false, NULL, true, false, true,
    'Empty nest and caring for aging mother. Seeking guidance for new chapter.',
    'George Clark', '555-200-0006', 'Osteoarthritis (mild), hypertension', 'L', '2025-07-28'),
  -- Career-focused single
  ('a1000125-0000-0001-8000-000000000125', 'e1000125-0000-4000-8000-000000000125',
    'Barbara', 'Hill', 'barbara.hill@example.com', '555-200-0007', '1993-03-22', 31,
    '6148 Sunrise Peak Ct', 'Phoenix', 'AZ', '85015', 'Trinity Methodist Church', 'Single', NULL,
    false, NULL, true, false, false,
    'Career-driven but empty. Want God''s purpose beyond professional achievements.',
    'Margaret Hill (Mother)', '555-200-0008', 'None', 'S', '2025-07-29'),
  -- Divorced, struggling
  ('a1000126-0000-0001-8000-000000000126', 'e1000126-0000-4000-8000-000000000126',
    'Dorothy', 'Scott', 'dorothy.scott@example.com', '555-200-0009', '1972-09-05', 52,
    '1472 Roadrunner Trail', 'Phoenix', 'AZ', '85016', 'Crossroads Bible Church', 'Divorced', NULL,
    false, NULL, true, false, false,
    'Divorced after 25 years. Struggling with identity and forgiveness. Need healing.',
    'Sandra Peters (Sister)', '555-200-0010', 'Depression (in treatment), fibromyalgia', 'M', '2025-07-30'),
  -- Widow ready for new season
  ('a1000127-0000-0001-8000-000000000127', 'e1000127-0000-4000-8000-000000000127',
    'Nancy', 'Reed', 'nancy.reed@example.com', '555-200-0011', '1968-12-30', 56,
    '8359 Pueblo Vista Ave', 'Phoenix', 'AZ', '85017', 'First Baptist Church', 'Widowed', NULL,
    false, NULL, true, false, false,
    'Husband passed 3 years ago. Ready for new season, need God''s direction.',
    'Carol Reed (Daughter)', '555-200-0012', 'None', 'L', '2025-07-31'),
  -- Spouse attended, dietary needs
  ('a1000128-0000-0001-8000-000000000128', 'e1000128-0000-4000-8000-000000000128',
    'Helen', 'Bryant', 'helen.bryant@example.com', '555-200-0013', '1991-05-18', 33,
    '3705 Mesquite Grove Dr', 'Phoenix', 'AZ', '85018', 'Grace Community Church', 'Married', 'Charles Bryant',
    true, 'DTTD Mens #44', true, false, true,
    'Husband attended and transformed our marriage. Want to experience myself.',
    'Charles Bryant', '555-200-0014', 'Celiac disease (strict gluten-free)', 'M', '2025-08-01'),
  -- Religious busyness
  ('a1000129-0000-0001-8000-000000000129', 'e1000129-0000-4000-8000-000000000129',
    'Maria', 'Flores', 'maria.flores@example.com', '555-200-0015', '1986-08-24', 38,
    '5914 Ocotillo Canyon Rd', 'Phoenix', 'AZ', '85019', 'Trinity Methodist Church', 'Married', 'Luis Flores',
    false, NULL, true, false, false,
    'Distant from God despite church busyness. Want authentic faith, not religion.',
    'Luis Flores', '555-200-0016', 'None', 'S', '2025-08-02');

-- Women's Active Weekend - Awaiting payment (forms completed)
INSERT INTO public.candidate_info (
  id, candidate_id, first_name, last_name, email, phone, date_of_birth, age,
  address_line_1, city, state, zip, church, marital_status,
  is_christian, member_of_clergy, has_friends_attending_weekend, reason_for_attending,
  emergency_contact_name, emergency_contact_phone, medical_conditions, shirt_size, created_at
) VALUES
  ('a1000130-0000-0001-8000-000000000130', 'e1000130-0000-4000-8000-000000000130',
    'Patricia', 'Moore', 'patricia.moore@example.com', '555-200-0017', '1979-04-07', 45,
    '7260 Ironwood Mesa Dr', 'Phoenix', 'AZ', '85020', 'Crossroads Bible Church', 'Single',
    true, false, false, 'Never married, trusting God. Want to grow in contentment.',
    'Laura Moore (Sister)', '555-200-0018', 'None', 'M', '2025-08-03');

-- Women's Active Weekend - Pending approval (forms completed, awaiting review)
INSERT INTO public.candidate_info (
  id, candidate_id, first_name, last_name, email, phone, date_of_birth, age,
  address_line_1, city, state, zip, church, marital_status,
  is_christian, member_of_clergy, has_friends_attending_weekend, reason_for_attending,
  emergency_contact_name, emergency_contact_phone, medical_conditions, shirt_size, created_at
) VALUES
  ('a1000142-0000-0001-8000-000000000142', 'e1000142-0000-4000-8000-000000000142',
    'Rebecca', 'Martinez', 'rebecca.martinez@example.com', '555-142-0009', '1968-11-23', 56,
    '9134 Palo Verde Ln', 'Phoenix', 'AZ', '85021', 'Crossroads Bible Church', 'Married',
    true, false, false, 'Kids all grown and moved out. Searching for new purpose in this season.',
    'Carlos Martinez (Husband)', '555-142-0010', 'Arthritis (mild, takes OTC medication)', 'L', '2025-07-27'),
  ('a1000143-0000-0001-8000-000000000143', 'e1000143-0000-4000-8000-000000000143',
    'Lauren', 'Thompson', 'lauren.thompson@example.com', '555-143-0011', '1986-07-14', 38,
    '4521 Sunset Ridge Way', 'Phoenix', 'AZ', '85022', 'First Baptist Church', 'Divorced',
    true, false, true, 'Divorced 2 years ago. Ready to move forward and find God''s plan for my life.',
    'Karen Thompson (Mother)', '555-143-0012', 'None', 'S', '2025-07-28');

-- =============================================================================
-- SECTION: Complete Sponsorship Info for ALL remaining candidates
-- =============================================================================

-- Men's Active Weekend - Remaining confirmed candidates (e1000103-109)
INSERT INTO public.candidate_sponsorship_info (
  id, candidate_id, candidate_name, candidate_email, sponsor_name, sponsor_email, sponsor_phone,
  sponsor_church, sponsor_weekend, contact_frequency, home_environment,
  god_evidence, support_plan, payment_owner, created_at
) VALUES
  ('f1000101-0000-4000-8000-000000000101', 'e1000101-0000-4000-8000-000000000101',
    'David Chen', 'david.chen@example.com', 'Michael Johnson', 'michael.johnson@example.com', '555-234-5678',
    'Grace Community Church', 'DTTD Mens #41', 'Weekly', 'Single, living with roommates',
    'Recently started attending Bible study', 'Connect with young adult ministry', 'michael.johnson@example.com', '2025-06-02'),
  ('f1000102-0000-4000-8000-000000000102', 'e1000102-0000-4000-8000-000000000102',
    'Robert Martinez', 'robert.martinez@example.com', 'David Brown', 'david.brown@example.com', '555-345-6789',
    'St. Mary''s Catholic Church', 'DTTD Mens #42', 'Bi-weekly', 'Divorced, shares custody of 3 kids',
    'Seeking healing and restoration', 'Support through transition', 'david.brown@example.com', '2025-06-03'),
  ('f1000103-0000-4000-8000-000000000103', 'e1000103-0000-4000-8000-000000000103',
    'Anthony Baker', 'anthony.baker@example.com', 'Eric Adams', 'eric.adams@example.com', '555-400-0001',
    'Trinity Methodist Church', 'DTTD Mens #40', 'Monthly', 'Single, questioning faith',
    'Exploring if Christianity is really true', 'Patient discipleship', 'eric.adams@example.com', '2025-06-04'),
  ('f1000104-0000-4000-8000-000000000104', 'e1000104-0000-4000-8000-000000000104',
    'Steven Foster', 'steven.foster@example.com', 'Jacob Baker', 'jacob.baker@example.com', '555-400-0002',
    'Crossroads Bible Church', 'DTTD Mens #41', 'Monthly', 'Married, associate pastor',
    'Wants deeper personal walk with Christ', 'Peer mentorship in ministry', 'jacob.baker@example.com', '2025-06-05'),
  ('f1000105-0000-4000-8000-000000000105', 'e1000105-0000-4000-8000-000000000105',
    'Gregory Walsh', 'gregory.walsh@example.com', 'Samuel Rivera', 'samuel.rivera@example.com', '555-400-0003',
    'First Baptist Church', 'DTTD Mens #42', 'Weekly', 'Widower, grieving wife',
    'Friend said this helped during hard times', 'Grief support and prayer', 'samuel.rivera@example.com', '2025-06-06'),
  ('f1000106-0000-4000-8000-000000000106', 'e1000106-0000-4000-8000-000000000106',
    'Raymond Cooper', 'raymond.cooper@example.com', 'Patrick Mitchell', 'patrick.mitchell@example.com', '555-400-0004',
    'Grace Community Church', 'DTTD Mens #40', 'Monthly', 'Married, wife attended recently',
    'Wife transformed, wants same experience', 'Couples prayer and fellowship', 'patrick.mitchell@example.com', '2025-06-07'),
  ('f1000107-0000-4000-8000-000000000107', 'e1000107-0000-4000-8000-000000000107',
    'Philip Hughes', 'philip.hughes@example.com', 'Nathan Flores', 'nathan.flores@example.com', '555-400-0005',
    'Trinity Methodist Church', 'DTTD Mens #41', 'Bi-weekly', 'Engaged, getting married next summer',
    'Wants spiritual foundation for marriage', 'Pre-marital spiritual mentorship', 'nathan.flores@example.com', '2025-06-08'),
  ('f1000108-0000-4000-8000-000000000108', 'e1000108-0000-4000-8000-000000000108',
    'Dennis Murray', 'dennis.murray@example.com', 'Adam Nguyen', 'adam.nguyen@example.com', '555-400-0006',
    'Crossroads Bible Church', 'DTTD Mens #42', 'Weekly', 'Separated, trying to save marriage',
    'Pastor recommended for spiritual strength', 'Marriage crisis support', 'adam.nguyen@example.com', '2025-06-09'),
  ('f1000109-0000-4000-8000-000000000109', 'e1000109-0000-4000-8000-000000000109',
    'Gerald Dixon', 'gerald.dixon@example.com', 'Aaron Scott', 'aaron.scott@example.com', '555-400-0007',
    'St. Mary''s Catholic Church', 'DTTD Mens #40', 'Monthly', 'Married, active in church',
    'Spiritually dry despite activity', 'Accountability and deeper fellowship', 'aaron.scott@example.com', '2025-06-10');

-- Men's Active Weekend - Remaining awaiting payment (e1000111-112)
INSERT INTO public.candidate_sponsorship_info (
  id, candidate_id, candidate_name, candidate_email, sponsor_name, sponsor_email, sponsor_phone,
  sponsor_church, sponsor_weekend, contact_frequency, home_environment,
  god_evidence, support_plan, payment_owner, created_at
) VALUES
  ('f1000111-0000-4000-8000-000000000111', 'e1000111-0000-4000-8000-000000000111',
    'Brian Thompson', 'brian.thompson@example.com', 'Brandon Young', 'brandon.young@example.com', '555-400-0008',
    'Grace Community Church', 'DTTD Mens #41', 'Bi-weekly', 'Married with teenagers',
    'Wants to be better spiritual leader', 'Family discipleship support', 'brandon.young@example.com', '2025-07-02'),
  ('f1000112-0000-4000-8000-000000000112', 'e1000112-0000-4000-8000-000000000112',
    'Kevin Sanders', 'kevin.sanders@example.com', 'Tyler King', 'tyler.king@example.com', '555-400-0009',
    'First Baptist Church', 'DTTD Mens #42', 'Monthly', 'Single dad with young son',
    'Wants to raise son in faith', 'Single parent support', 'tyler.king@example.com', '2025-07-03');

-- Men's Active Weekend - Remaining awaiting forms (e1000114-116)
INSERT INTO public.candidate_sponsorship_info (
  id, candidate_id, candidate_name, candidate_email, sponsor_name, sponsor_email, sponsor_phone,
  sponsor_church, sponsor_weekend, contact_frequency, home_environment,
  god_evidence, support_plan, payment_owner, created_at
) VALUES
  ('f1000114-0000-4000-8000-000000000114', 'e1000114-0000-4000-8000-000000000114',
    'Christopher Lee', 'christopher.lee@example.com', 'William Lopez', 'william.lopez@example.com', '555-400-0010',
    'First Baptist Church', 'DTTD Mens #42', 'Monthly', 'Married, owns small business',
    'Wants to prioritize faith over business', 'Business mentorship and accountability', 'william.lopez@example.com', '2025-07-11'),
  ('f1000115-0000-4000-8000-000000000115', 'e1000115-0000-4000-8000-000000000115',
    'Matthew Davis', 'matthew.davis@example.com', 'Justin Robinson', 'justin.robinson@example.com', '555-400-0011',
    'Grace Community Church', 'DTTD Mens #40', 'Weekly', 'Married, deployed to Iraq previously',
    'Struggling with PTSD and faith', 'Veteran support and prayer', 'justin.robinson@example.com', '2025-07-12'),
  ('f1000116-0000-4000-8000-000000000116', 'e1000116-0000-4000-8000-000000000116',
    'Andrew Nelson', 'andrew.nelson@example.com', 'Ryan Ramirez', 'ryan.ramirez@example.com', '555-400-0012',
    'Trinity Methodist Church', 'DTTD Mens #41', 'Bi-weekly', 'Single, recovering alcoholic',
    'One year sober, seeking spiritual foundation', 'Recovery support and discipleship', 'ryan.ramirez@example.com', '2025-07-13');

-- Men's Active Weekend - Remaining sponsored (e1000118-119)
INSERT INTO public.candidate_sponsorship_info (
  id, candidate_id, candidate_name, candidate_email, sponsor_name, sponsor_email, sponsor_phone,
  sponsor_church, sponsor_weekend, contact_frequency, home_environment,
  god_evidence, support_plan, payment_owner, created_at
) VALUES
  ('f1000118-0000-4000-8000-000000000118', 'e1000118-0000-4000-8000-000000000118',
    'Kevin Murphy', 'kevin.murphy@example.com', 'Matthew Thomas', 'matthew.thomas@example.com', '555-400-0013',
    'Trinity Methodist Church', 'DTTD Mens #40', 'Monthly', 'Single parent with teenage daughter',
    'Wants to be better spiritual leader', 'Single parent support around shift work', 'matthew.thomas@example.com', '2025-08-02'),
  ('f1000119-0000-4000-8000-000000000119', 'e1000119-0000-4000-8000-000000000119',
    'Timothy Wright', 'timothy.wright@example.com', 'Daniel Moore', 'daniel.moore@example.com', '555-400-0014',
    'Crossroads Bible Church', 'DTTD Mens #42', 'Bi-weekly', 'Married, new believer',
    'Recently saved, eager to grow', 'New believer discipleship', 'daniel.moore@example.com', '2025-08-03');

-- Men's Active Weekend - Remaining rejected (e1000121)
INSERT INTO public.candidate_sponsorship_info (
  id, candidate_id, candidate_name, candidate_email, sponsor_name, sponsor_email, sponsor_phone,
  sponsor_church, sponsor_weekend, contact_frequency, home_environment,
  god_evidence, support_plan, payment_owner, created_at
) VALUES
  ('f1000121-0000-4000-8000-000000000121', 'e1000121-0000-4000-8000-000000000121',
    'Brian Stevens', 'brian.stevens@example.com', 'Samuel Rivera', 'samuel.rivera@example.com', '555-400-0015',
    'First Baptist Church', 'DTTD Mens #42', 'Rarely', 'Living with girlfriend, not married',
    'Sponsor enthusiastic but candidate limited interest', 'Would try monthly contact', 'samuel.rivera@example.com', '2025-06-16');

-- Women's Active Weekend - Remaining confirmed (e1000123-129)
INSERT INTO public.candidate_sponsorship_info (
  id, candidate_id, candidate_name, candidate_email, sponsor_name, sponsor_email, sponsor_phone,
  sponsor_church, sponsor_weekend, contact_frequency, home_environment,
  god_evidence, support_plan, payment_owner, created_at
) VALUES
  ('f1000123-0000-4000-8000-000000000123', 'e1000123-0000-4000-8000-000000000123',
    'Lisa Robinson', 'lisa.robinson@example.com', 'Emily Jones', 'emily.jones@example.com', '555-500-0001',
    'Grace Community Church', 'DTTD Womens #41', 'Weekly', 'Remarried, blended family',
    'Wants Christ-centered marriage and family unity', 'Marriage mentorship', 'emily.jones@example.com', '2025-06-02'),
  ('f1000124-0000-4000-8000-000000000124', 'e1000124-0000-4000-8000-000000000124',
    'Susan Clark', 'susan.clark@example.com', 'Amanda Martinez', 'amanda.martinez@example.com', '555-500-0002',
    'St. Mary''s Catholic Church', 'DTTD Womens #42', 'Bi-weekly', 'Empty nester, cares for aging mother',
    'Seeking deeper prayer life', 'Spiritual direction partnership', 'amanda.martinez@example.com', '2025-06-03'),
  ('f1000125-0000-4000-8000-000000000125', 'e1000125-0000-4000-8000-000000000125',
    'Barbara Hill', 'barbara.hill@example.com', 'Tiffany Nelson', 'tiffany.nelson@example.com', '555-500-0003',
    'Trinity Methodist Church', 'DTTD Womens #40', 'Monthly', 'Single, career-focused',
    'Success but feeling empty', 'Help discover purpose beyond career', 'tiffany.nelson@example.com', '2025-06-04'),
  ('f1000126-0000-4000-8000-000000000126', 'e1000126-0000-4000-8000-000000000126',
    'Dorothy Scott', 'dorothy.scott@example.com', 'Brittany Hall', 'brittany.hall@example.com', '555-500-0004',
    'Crossroads Bible Church', 'DTTD Womens #41', 'Weekly', 'Divorced after 25 years',
    'Struggling with identity and forgiveness', 'Divorce recovery support', 'brittany.hall@example.com', '2025-06-05'),
  ('f1000127-0000-4000-8000-000000000127', 'e1000127-0000-4000-8000-000000000127',
    'Nancy Reed', 'nancy.reed@example.com', 'Katherine Campbell', 'katherine.campbell@example.com', '555-500-0005',
    'First Baptist Church', 'DTTD Womens #42', 'Bi-weekly', 'Widow, ready for new season',
    'Wants renewed purpose after loss', 'Widow support and encouragement', 'katherine.campbell@example.com', '2025-06-06'),
  ('f1000128-0000-4000-8000-000000000128', 'e1000128-0000-4000-8000-000000000128',
    'Helen Bryant', 'helen.bryant@example.com', 'Christina Torres', 'christina.torres@example.com', '555-500-0006',
    'Grace Community Church', 'DTTD Womens #40', 'Monthly', 'Married, husband attended',
    'Husband transformed by weekend', 'Couples spiritual growth', 'christina.torres@example.com', '2025-06-07'),
  ('f1000129-0000-4000-8000-000000000129', 'e1000129-0000-4000-8000-000000000129',
    'Maria Flores', 'maria.flores@example.com', 'Samantha Hill', 'samantha.hill@example.com', '555-500-0007',
    'Trinity Methodist Church', 'DTTD Womens #41', 'Weekly', 'Married, very busy with church',
    'Feeling distant despite church activity', 'Help move from busyness to intimacy', 'samantha.hill@example.com', '2025-06-08');

-- Women's Active Weekend - Remaining awaiting payment (e1000131)
INSERT INTO public.candidate_sponsorship_info (
  id, candidate_id, candidate_name, candidate_email, sponsor_name, sponsor_email, sponsor_phone,
  sponsor_church, sponsor_weekend, contact_frequency, home_environment,
  god_evidence, support_plan, payment_owner, created_at
) VALUES
  ('f1000131-0000-4000-8000-000000000131', 'e1000131-0000-4000-8000-000000000131',
    'Rachel Cooper', 'rachel.cooper@example.com', 'Victoria Green', 'victoria.green@example.com', '555-500-0008',
    'Grace Community Church', 'DTTD Womens #42', 'Monthly', 'Married with young twins',
    'Overwhelmed mom needing refreshment', 'Practical support and prayer', 'victoria.green@example.com', '2025-07-02');

-- Women's Active Weekend - Remaining awaiting forms (e1000133-134)
INSERT INTO public.candidate_sponsorship_info (
  id, candidate_id, candidate_name, candidate_email, sponsor_name, sponsor_email, sponsor_phone,
  sponsor_church, sponsor_weekend, contact_frequency, home_environment,
  god_evidence, support_plan, payment_owner, created_at
) VALUES
  ('f1000133-0000-4000-8000-000000000133', 'e1000133-0000-4000-8000-000000000133',
    'Michelle Davis', 'michelle.davis@example.com', 'Jennifer Anderson', 'jennifer.anderson@example.com', '555-500-0009',
    'First Baptist Church', 'DTTD Womens #42', 'Monthly', 'Married, husband not believer',
    'Prays for husband''s salvation', 'Support in unequally yoked marriage', 'jennifer.anderson@example.com', '2025-07-11'),
  ('f1000134-0000-4000-8000-000000000134', 'e1000134-0000-4000-8000-000000000134',
    'Laura Patterson', 'laura.patterson@example.com', 'Megan Wright', 'megan.wright@example.com', '555-500-0010',
    'Trinity Methodist Church', 'DTTD Womens #40', 'Bi-weekly', 'Single, works night shift as nurse',
    'Difficult to connect with church due to schedule', 'Flexible meeting times', 'megan.wright@example.com', '2025-07-12');

-- Women's Active Weekend - Remaining sponsored (e1000136-138)
INSERT INTO public.candidate_sponsorship_info (
  id, candidate_id, candidate_name, candidate_email, sponsor_name, sponsor_email, sponsor_phone,
  sponsor_church, sponsor_weekend, contact_frequency, home_environment,
  god_evidence, support_plan, payment_owner, created_at
) VALUES
  ('f1000136-0000-4000-8000-000000000136', 'e1000136-0000-4000-8000-000000000136',
    'Rebecca Brown', 'rebecca.brown@example.com', 'Kimberly Lee', 'kimberly.lee@example.com', '555-500-0011',
    'Crossroads Bible Church', 'DTTD Womens #40', 'Monthly', 'Married, husband deployed military',
    'Needs spiritual support during separation', 'Military spouse support', 'kimberly.lee@example.com', '2025-08-02'),
  ('f1000137-0000-4000-8000-000000000137', 'e1000137-0000-4000-8000-000000000137',
    'Sharon Hayes', 'sharon.hayes@example.com', 'Melissa Thompson', 'melissa.thompson@example.com', '555-500-0012',
    'First Baptist Church', 'DTTD Womens #41', 'Weekly', 'Single, caring for disabled parent',
    'Isolated due to caregiver responsibilities', 'Caregiver support and respite', 'melissa.thompson@example.com', '2025-08-03'),
  ('f1000138-0000-4000-8000-000000000138', 'e1000138-0000-4000-8000-000000000138',
    'Deborah King', 'deborah.king@example.com', 'Elizabeth Carter', 'elizabeth.carter@example.com', '555-500-0013',
    'Grace Community Church', 'DTTD Womens #42', 'Bi-weekly', 'Married, adult children with special needs',
    'Seeking strength for lifelong caregiving', 'Special needs parent support', 'elizabeth.carter@example.com', '2025-08-04');


-- =============================================================================
-- SECTION: Additional Candidate Info (Remaining confirmed & awaiting_payment)
-- =============================================================================

-- Men's Active Weekend - Remaining awaiting payment candidates (e1000111-112)
INSERT INTO public.candidate_info (
  id, candidate_id, first_name, last_name, email, phone, date_of_birth, age,
  address_line_1, city, state, zip, church, marital_status, spouse_name,
  is_christian, member_of_clergy, has_friends_attending_weekend, reason_for_attending,
  emergency_contact_name, emergency_contact_phone, medical_conditions, shirt_size, created_at
) VALUES
  ('a1000111-0000-0001-8000-000000000111', 'e1000111-0000-4000-8000-000000000111',
    'Brian', 'Thompson', 'brian.thompson@example.com', '555-400-0101', '1980-03-18', 44,
    '4521 Coyote Ridge Ave', 'Phoenix', 'AZ', '85021', 'Grace Community Church', 'Married', 'Laura Thompson',
    true, false, false, 'Want to be better spiritual leader for my teenage kids.',
    'Laura Thompson', '555-400-0102', 'None', 'L', '2025-07-26'),
  ('a1000112-0000-0001-8000-000000000112', 'e1000112-0000-4000-8000-000000000112',
    'Kevin', 'Sanders', 'kevin.sanders@example.com', '555-400-0103', '1986-09-25', 38,
    '8642 Mesa View Dr', 'Phoenix', 'AZ', '85022', 'First Baptist Church', 'Divorced', NULL,
    true, false, false, 'Single dad wanting to raise my son in the faith.',
    'Tom Sanders (Brother)', '555-400-0104', 'None', 'M', '2025-07-27');

-- Women's Active Weekend - Remaining awaiting payment (e1000131)
INSERT INTO public.candidate_info (
  id, candidate_id, first_name, last_name, email, phone, date_of_birth, age,
  address_line_1, city, state, zip, church, marital_status, spouse_name,
  is_christian, member_of_clergy, has_friends_attending_weekend, reason_for_attending,
  emergency_contact_name, emergency_contact_phone, medical_conditions, shirt_size, created_at
) VALUES
  ('a1000131-0000-0001-8000-000000000131', 'e1000131-0000-4000-8000-000000000131',
    'Rachel', 'Cooper', 'rachel.cooper@example.com', '555-500-0101', '1990-11-12', 34,
    '9753 Sunset Canyon Rd', 'Phoenix', 'AZ', '85023', 'Grace Community Church', 'Married', 'Mark Cooper',
    true, false, true, 'Overwhelmed mom of twins needing spiritual refreshment.',
    'Mark Cooper', '555-500-0102', 'Postpartum anxiety (in treatment)', 'M', '2025-08-04');

-- =============================================================================
-- SECTION: Weekend Group Members for DTTD #45
-- =============================================================================
-- One row per unique user in the group (shared across mens/womens weekends)
-- Group ID for #45: d0000004-0000-4000-8000-000000000004
-- Users 15 and 17 serve both weekends — they get ONE group member row each

INSERT INTO public.weekend_group_members (id, group_id, user_id, attended_secuela_at, created_at) VALUES
  -- Men's-only members
  ('ab000001-0000-4000-8000-000000000001', 'd0000004-0000-4000-8000-000000000004', 'b0000003-0000-4000-8000-000000000003', '2025-05-25T14:00:00Z', '2025-06-01'),
  ('ab000002-0000-4000-8000-000000000002', 'd0000004-0000-4000-8000-000000000004', 'b0000005-0000-4000-8000-000000000005', '2025-05-25T14:00:00Z', '2025-06-02'),
  ('ab000003-0000-4000-8000-000000000003', 'd0000004-0000-4000-8000-000000000004', 'b0000007-0000-4000-8000-000000000007', NULL, '2025-06-03'),
  ('ab000004-0000-4000-8000-000000000004', 'd0000004-0000-4000-8000-000000000004', 'b0000009-0000-4000-8000-000000000009', '2025-05-25T14:00:00Z', '2025-06-04'),
  ('ab000005-0000-4000-8000-000000000005', 'd0000004-0000-4000-8000-000000000004', 'b0000011-0000-4000-8000-000000000011', '2025-05-25T14:00:00Z', '2025-06-05'),
  ('ab000006-0000-4000-8000-000000000006', 'd0000004-0000-4000-8000-000000000004', 'b0000013-0000-4000-8000-000000000013', NULL, '2025-06-06'),
  ('ab000007-0000-4000-8000-000000000007', 'd0000004-0000-4000-8000-000000000004', 'b0000019-0000-4000-8000-000000000019', '2025-06-01T10:00:00Z', '2025-06-09'),
  ('ab000008-0000-4000-8000-000000000008', 'd0000004-0000-4000-8000-000000000004', 'b0000021-0000-4000-8000-000000000021', '2025-06-01T10:00:00Z', '2025-06-10'),
  ('ab000009-0000-4000-8000-000000000009', 'd0000004-0000-4000-8000-000000000004', 'b0000023-0000-4000-8000-000000000023', NULL, '2025-06-11'),
  ('ab000010-0000-4000-8000-000000000010', 'd0000004-0000-4000-8000-000000000004', 'b0000025-0000-4000-8000-000000000025', '2025-05-25T14:00:00Z', '2025-06-12'),
  -- Both-weekends members (Christopher=15, Matthew=17)
  ('ab000011-0000-4000-8000-000000000011', 'd0000004-0000-4000-8000-000000000004', 'b0000015-0000-4000-8000-000000000015', '2025-05-25T14:00:00Z', '2025-06-07'),
  ('ab000012-0000-4000-8000-000000000012', 'd0000004-0000-4000-8000-000000000004', 'b0000017-0000-4000-8000-000000000017', '2025-05-25T14:00:00Z', '2025-06-08'),
  -- Women's-only members
  ('ab000013-0000-4000-8000-000000000013', 'd0000004-0000-4000-8000-000000000004', 'b0000004-0000-4000-8000-000000000004', '2025-05-25T14:00:00Z', '2025-06-01'),
  ('ab000014-0000-4000-8000-000000000014', 'd0000004-0000-4000-8000-000000000004', 'b0000006-0000-4000-8000-000000000006', '2025-05-25T14:00:00Z', '2025-06-02'),
  ('ab000015-0000-4000-8000-000000000015', 'd0000004-0000-4000-8000-000000000004', 'b0000008-0000-4000-8000-000000000008', NULL, '2025-06-03'),
  ('ab000016-0000-4000-8000-000000000016', 'd0000004-0000-4000-8000-000000000004', 'b0000010-0000-4000-8000-000000000010', '2025-05-25T14:00:00Z', '2025-06-04'),
  ('ab000017-0000-4000-8000-000000000017', 'd0000004-0000-4000-8000-000000000004', 'b0000012-0000-4000-8000-000000000012', '2025-05-25T14:00:00Z', '2025-06-05'),
  ('ab000018-0000-4000-8000-000000000018', 'd0000004-0000-4000-8000-000000000004', 'b0000014-0000-4000-8000-000000000014', NULL, '2025-06-06'),
  ('ab000019-0000-4000-8000-000000000019', 'd0000004-0000-4000-8000-000000000004', 'b0000018-0000-4000-8000-000000000018', '2025-05-25T14:00:00Z', '2025-06-09'),
  ('ab000020-0000-4000-8000-000000000020', 'd0000004-0000-4000-8000-000000000004', 'b0000020-0000-4000-8000-000000000020', '2025-06-01T10:00:00Z', '2025-06-10'),
  ('ab000021-0000-4000-8000-000000000021', 'd0000004-0000-4000-8000-000000000004', 'b0000022-0000-4000-8000-000000000022', '2025-05-25T14:00:00Z', '2025-06-11'),
  ('ab000022-0000-4000-8000-000000000022', 'd0000004-0000-4000-8000-000000000004', 'b0000024-0000-4000-8000-000000000024', NULL, '2025-06-12');

-- =============================================================================
-- SECTION: Weekend Roster (Team Members for Historical Weekends)
-- =============================================================================
-- Team members who served on historical weekends

INSERT INTO public.weekend_roster (id, weekend_id, user_id, group_member_id, cha_role, status, created_at) VALUES
  -- Men's Weekend #42 (FINISHED - Spring 2024) — no group_member_id (historical, no weekend_group_members rows)
  ('aa000001-0000-4000-8000-000000000001', 'c0000001-0000-4000-8000-000000000001', 'b0000003-0000-4000-8000-000000000003', NULL, 'Rector', 'confirmed', '2024-01-15'),
  ('aa000002-0000-4000-8000-000000000002', 'c0000001-0000-4000-8000-000000000001', 'b0000005-0000-4000-8000-000000000005', NULL, 'Head', 'confirmed', '2024-01-16'),
  ('aa000003-0000-4000-8000-000000000003', 'c0000001-0000-4000-8000-000000000001', 'b0000007-0000-4000-8000-000000000007', NULL, 'Table Leader', 'confirmed', '2024-01-17'),
  ('aa000004-0000-4000-8000-000000000004', 'c0000001-0000-4000-8000-000000000001', 'b0000009-0000-4000-8000-000000000009', NULL, 'Music', 'confirmed', '2024-01-18'),
  ('aa000005-0000-4000-8000-000000000005', 'c0000001-0000-4000-8000-000000000001', 'b0000011-0000-4000-8000-000000000011', NULL, 'Dining', 'confirmed', '2024-01-19'),
  -- Women's Weekend #42 (FINISHED - Spring 2024)
  ('aa000006-0000-4000-8000-000000000006', 'c0000002-0000-4000-8000-000000000001', 'b0000004-0000-4000-8000-000000000004', NULL, 'Rector', 'confirmed', '2024-01-15'),
  ('aa000007-0000-4000-8000-000000000007', 'c0000002-0000-4000-8000-000000000001', 'b0000006-0000-4000-8000-000000000006', NULL, 'Head', 'confirmed', '2024-01-16'),
  ('aa000008-0000-4000-8000-000000000008', 'c0000002-0000-4000-8000-000000000001', 'b0000008-0000-4000-8000-000000000008', NULL, 'Table Leader', 'confirmed', '2024-01-17'),
  ('aa000009-0000-4000-8000-000000000009', 'c0000002-0000-4000-8000-000000000001', 'b0000010-0000-4000-8000-000000000010', NULL, 'Music', 'confirmed', '2024-01-18'),
  ('aa000010-0000-4000-8000-000000000010', 'c0000002-0000-4000-8000-000000000001', 'b0000012-0000-4000-8000-000000000012', NULL, 'Dining', 'confirmed', '2024-01-19'),
  -- Men's Weekend #43 (FINISHED - Fall 2024)
  ('aa000011-0000-4000-8000-000000000011', 'c0000003-0000-4000-8000-000000000002', 'b0000005-0000-4000-8000-000000000005', NULL, 'Rector', 'confirmed', '2024-07-15'),
  ('aa000012-0000-4000-8000-000000000012', 'c0000003-0000-4000-8000-000000000002', 'b0000007-0000-4000-8000-000000000007', NULL, 'Head', 'confirmed', '2024-07-16'),
  ('aa000013-0000-4000-8000-000000000013', 'c0000003-0000-4000-8000-000000000002', 'b0000009-0000-4000-8000-000000000009', NULL, 'Table Leader', 'confirmed', '2024-07-17'),
  ('aa000014-0000-4000-8000-000000000014', 'c0000003-0000-4000-8000-000000000002', 'b0000011-0000-4000-8000-000000000011', NULL, 'Music', 'confirmed', '2024-07-18'),
  -- Women's Weekend #43 (FINISHED - Fall 2024)
  ('aa000015-0000-4000-8000-000000000015', 'c0000004-0000-4000-8000-000000000002', 'b0000006-0000-4000-8000-000000000006', NULL, 'Rector', 'confirmed', '2024-07-15'),
  ('aa000016-0000-4000-8000-000000000016', 'c0000004-0000-4000-8000-000000000002', 'b0000008-0000-4000-8000-000000000008', NULL, 'Head', 'confirmed', '2024-07-16'),
  ('aa000017-0000-4000-8000-000000000017', 'c0000004-0000-4000-8000-000000000002', 'b0000010-0000-4000-8000-000000000010', NULL, 'Table Leader', 'confirmed', '2024-07-17'),

  -- =============================================================================
  -- Men's Weekend #45 (ACTIVE - Fall 2025) — 12 team members
  -- =============================================================================
  -- group_member_id maps user_id → weekend_group_members.id (group d0000004)
  ('aa000020-0000-4000-8000-000000000020', 'c0000007-0000-4000-8000-000000000004', 'b0000003-0000-4000-8000-000000000003', 'ab000001-0000-4000-8000-000000000001', 'Rector', 'paid', '2025-06-01'),
  ('aa000021-0000-4000-8000-000000000021', 'c0000007-0000-4000-8000-000000000004', 'b0000005-0000-4000-8000-000000000005', 'ab000002-0000-4000-8000-000000000002', 'Head', 'paid', '2025-06-02'),
  ('aa000022-0000-4000-8000-000000000022', 'c0000007-0000-4000-8000-000000000004', 'b0000007-0000-4000-8000-000000000007', 'ab000003-0000-4000-8000-000000000003', 'Assistant Head', 'paid', '2025-06-03'),
  ('aa000023-0000-4000-8000-000000000023', 'c0000007-0000-4000-8000-000000000004', 'b0000009-0000-4000-8000-000000000009', 'ab000004-0000-4000-8000-000000000004', 'Head Tech', 'paid', '2025-06-04'),
  ('aa000024-0000-4000-8000-000000000024', 'c0000007-0000-4000-8000-000000000004', 'b0000011-0000-4000-8000-000000000011', 'ab000005-0000-4000-8000-000000000005', 'Table Leader', 'paid', '2025-06-05'),
  ('aa000025-0000-4000-8000-000000000025', 'c0000007-0000-4000-8000-000000000004', 'b0000013-0000-4000-8000-000000000013', 'ab000006-0000-4000-8000-000000000006', 'Head Music', 'paid', '2025-06-06'),
  ('aa000026-0000-4000-8000-000000000026', 'c0000007-0000-4000-8000-000000000004', 'b0000015-0000-4000-8000-000000000015', 'ab000011-0000-4000-8000-000000000011', 'Tech', 'paid', '2025-06-07'),
  ('aa000027-0000-4000-8000-000000000027', 'c0000007-0000-4000-8000-000000000004', 'b0000017-0000-4000-8000-000000000017', 'ab000012-0000-4000-8000-000000000012', 'Head Prayer', 'paid', '2025-06-08'),
  ('aa000028-0000-4000-8000-000000000028', 'c0000007-0000-4000-8000-000000000004', 'b0000019-0000-4000-8000-000000000019', 'ab000007-0000-4000-8000-000000000007', 'Prayer', 'paid', '2025-06-09'),
  ('aa000029-0000-4000-8000-000000000029', 'c0000007-0000-4000-8000-000000000004', 'b0000021-0000-4000-8000-000000000021', 'ab000008-0000-4000-8000-000000000008', 'Head Dining', 'paid', '2025-06-10'),
  ('aa000030-0000-4000-8000-000000000030', 'c0000007-0000-4000-8000-000000000004', 'b0000023-0000-4000-8000-000000000023', 'ab000009-0000-4000-8000-000000000009', 'Dining', 'paid', '2025-06-11'),
  ('aa000031-0000-4000-8000-000000000031', 'c0000007-0000-4000-8000-000000000004', 'b0000025-0000-4000-8000-000000000025', 'ab000010-0000-4000-8000-000000000010', 'Floater', 'paid', '2025-06-12'),

  -- =============================================================================
  -- Women's Weekend #45 (ACTIVE - Fall 2025) — 12 team members
  -- =============================================================================
  -- User 15 (Christopher) serves Tech on both weekends (dedup test: same role) — shares ab000011
  -- User 17 (Matthew) serves Table Leader on Women's (different role from Men's) — shares ab000012
  ('aa000040-0000-4000-8000-000000000040', 'c0000008-0000-4000-8000-000000000004', 'b0000004-0000-4000-8000-000000000004', 'ab000013-0000-4000-8000-000000000013', 'Rector', 'paid', '2025-06-01'),
  ('aa000041-0000-4000-8000-000000000041', 'c0000008-0000-4000-8000-000000000004', 'b0000006-0000-4000-8000-000000000006', 'ab000014-0000-4000-8000-000000000014', 'Head', 'paid', '2025-06-02'),
  ('aa000042-0000-4000-8000-000000000042', 'c0000008-0000-4000-8000-000000000004', 'b0000008-0000-4000-8000-000000000008', 'ab000015-0000-4000-8000-000000000015', 'Assistant Head', 'paid', '2025-06-03'),
  ('aa000043-0000-4000-8000-000000000043', 'c0000008-0000-4000-8000-000000000004', 'b0000010-0000-4000-8000-000000000010', 'ab000016-0000-4000-8000-000000000016', 'Head Tech', 'paid', '2025-06-04'),
  ('aa000044-0000-4000-8000-000000000044', 'c0000008-0000-4000-8000-000000000004', 'b0000012-0000-4000-8000-000000000012', 'ab000017-0000-4000-8000-000000000017', 'Table Leader', 'paid', '2025-06-05'),
  ('aa000045-0000-4000-8000-000000000045', 'c0000008-0000-4000-8000-000000000004', 'b0000014-0000-4000-8000-000000000014', 'ab000018-0000-4000-8000-000000000018', 'Head Music', 'paid', '2025-06-06'),
  ('aa000046-0000-4000-8000-000000000046', 'c0000008-0000-4000-8000-000000000004', 'b0000015-0000-4000-8000-000000000015', 'ab000011-0000-4000-8000-000000000011', 'Tech', 'paid', '2025-06-07'),
  ('aa000047-0000-4000-8000-000000000047', 'c0000008-0000-4000-8000-000000000004', 'b0000017-0000-4000-8000-000000000017', 'ab000012-0000-4000-8000-000000000012', 'Table Leader', 'paid', '2025-06-08'),
  ('aa000048-0000-4000-8000-000000000048', 'c0000008-0000-4000-8000-000000000004', 'b0000018-0000-4000-8000-000000000018', 'ab000019-0000-4000-8000-000000000019', 'Prayer', 'paid', '2025-06-09'),
  ('aa000049-0000-4000-8000-000000000049', 'c0000008-0000-4000-8000-000000000004', 'b0000020-0000-4000-8000-000000000020', 'ab000020-0000-4000-8000-000000000020', 'Head Dining', 'paid', '2025-06-10'),
  ('aa000050-0000-4000-8000-000000000050', 'c0000008-0000-4000-8000-000000000004', 'b0000022-0000-4000-8000-000000000022', 'ab000021-0000-4000-8000-000000000021', 'Dining', 'paid', '2025-06-11'),
  ('aa000051-0000-4000-8000-000000000051', 'c0000008-0000-4000-8000-000000000004', 'b0000024-0000-4000-8000-000000000024', 'ab000022-0000-4000-8000-000000000022', 'Floater', 'paid', '2025-06-12');

-- =============================================================================
-- SECTION: Prior User Experience (users_experience table)
-- =============================================================================
-- Pre-populate service history for 10 users:
-- 5 users with 2 prior weekends (Level 2), 5 users with 3 prior weekends (Level 3)
-- Uses external community references and past DTTD weekends

INSERT INTO public.users_experience (id, user_id, weekend_id, cha_role, weekend_reference, rollo, created_at, updated_at) VALUES
  -- User 3 (John Smith) — 3 prior weekends (Level 3)
  ('ae000001-0000-4000-8000-000000000001', 'b0000003-0000-4000-8000-000000000003', 'c0000001-0000-4000-8000-000000000001', 'Table Leader', 'DTTD#42', 'Ideals', '2024-03-17', '2024-03-17'),
  ('ae000002-0000-4000-8000-000000000002', 'b0000003-0000-4000-8000-000000000003', 'c0000003-0000-4000-8000-000000000002', 'Head', 'DTTD#43', NULL, '2024-09-22', '2024-09-22'),
  ('ae000003-0000-4000-8000-000000000003', 'b0000003-0000-4000-8000-000000000003', NULL, 'Table Leader', 'KAIROS#8', 'Grace', '2023-05-10', '2023-05-10'),

  -- User 5 (Michael Johnson) — 4 prior weekends (Level 3) — RECTOR READY
  -- Criteria: Head/Asst Head ✓ (Asst Head #44), Team Head ✓ (Head Tech #43),
  --           2+ Rollos ✓ (Ideals #42, Grace #44), Dining ✓ (Dining #41)
  ('ae000004-0000-4000-8000-000000000004', 'b0000005-0000-4000-8000-000000000005', 'c0000001-0000-4000-8000-000000000001', 'Tech', 'DTTD#42', 'Ideals', '2024-03-17', '2024-03-17'),
  ('ae000005-0000-4000-8000-000000000005', 'b0000005-0000-4000-8000-000000000005', 'c0000003-0000-4000-8000-000000000002', 'Head Tech', 'DTTD#43', NULL, '2024-09-22', '2024-09-22'),
  ('ae000006-0000-4000-8000-000000000006', 'b0000005-0000-4000-8000-000000000005', 'c0000005-0000-4000-8000-000000000003', 'Assistant Head', 'DTTD#44', 'Grace', '2025-03-16', '2025-03-16'),
  ('ae000026-0000-4000-8000-000000000026', 'b0000005-0000-4000-8000-000000000005', NULL, 'Dining', 'DTTD#41', NULL, '2023-09-17', '2023-09-17'),

  -- User 7 (David Brown) — 3 prior weekends (Level 3)
  ('ae000007-0000-4000-8000-000000000007', 'b0000007-0000-4000-8000-000000000007', 'c0000001-0000-4000-8000-000000000001', 'Prayer', 'DTTD#42', NULL, '2024-03-17', '2024-03-17'),
  ('ae000008-0000-4000-8000-000000000008', 'b0000007-0000-4000-8000-000000000007', 'c0000003-0000-4000-8000-000000000002', 'Table Leader', 'DTTD#43', 'Church', '2024-09-22', '2024-09-22'),
  ('ae000009-0000-4000-8000-000000000009', 'b0000007-0000-4000-8000-000000000007', 'c0000005-0000-4000-8000-000000000003', 'Head Dining', 'DTTD#44', NULL, '2025-03-16', '2025-03-16'),

  -- User 4 (Jane Doe) — 3 prior weekends (Level 3)
  ('ae000010-0000-4000-8000-000000000010', 'b0000004-0000-4000-8000-000000000004', 'c0000002-0000-4000-8000-000000000001', 'Music', 'DTTD#42', NULL, '2024-03-17', '2024-03-17'),
  ('ae000011-0000-4000-8000-000000000011', 'b0000004-0000-4000-8000-000000000004', 'c0000004-0000-4000-8000-000000000002', 'Head Music', 'DTTD#43', NULL, '2024-09-22', '2024-09-22'),
  ('ae000012-0000-4000-8000-000000000012', 'b0000004-0000-4000-8000-000000000004', NULL, 'Table Leader', 'TRES_DIAS#15', 'Holy Spirit', '2023-09-20', '2023-09-20'),

  -- User 6 (Sarah Williams) — 3 prior weekends (Level 3)
  ('ae000013-0000-4000-8000-000000000013', 'b0000006-0000-4000-8000-000000000006', 'c0000002-0000-4000-8000-000000000001', 'Head', 'DTTD#42', NULL, '2024-03-17', '2024-03-17'),
  ('ae000014-0000-4000-8000-000000000014', 'b0000006-0000-4000-8000-000000000006', 'c0000004-0000-4000-8000-000000000002', 'Assistant Head', 'DTTD#43', NULL, '2024-09-22', '2024-09-22'),
  ('ae000015-0000-4000-8000-000000000015', 'b0000006-0000-4000-8000-000000000006', 'c0000006-0000-4000-8000-000000000003', 'Dining', 'DTTD#44', NULL, '2025-03-16', '2025-03-16'),

  -- User 9 (James Garcia) — 2 prior weekends (Level 2)
  ('ae000016-0000-4000-8000-000000000016', 'b0000009-0000-4000-8000-000000000009', 'c0000001-0000-4000-8000-000000000001', 'Dining', 'DTTD#42', NULL, '2024-03-17', '2024-03-17'),
  ('ae000017-0000-4000-8000-000000000017', 'b0000009-0000-4000-8000-000000000009', 'c0000003-0000-4000-8000-000000000002', 'Tech', 'DTTD#43', NULL, '2024-09-22', '2024-09-22'),

  -- User 11 (Robert Rodriguez) — 2 prior weekends (Level 2)
  ('ae000018-0000-4000-8000-000000000018', 'b0000011-0000-4000-8000-000000000011', 'c0000001-0000-4000-8000-000000000001', 'Music', 'DTTD#42', NULL, '2024-03-17', '2024-03-17'),
  ('ae000019-0000-4000-8000-000000000019', 'b0000011-0000-4000-8000-000000000011', NULL, 'Prayer', 'KAIROS#10', NULL, '2023-11-15', '2023-11-15'),

  -- User 10 (Amanda Martinez) — 2 prior weekends (Level 2)
  ('ae000020-0000-4000-8000-000000000020', 'b0000010-0000-4000-8000-000000000010', 'c0000002-0000-4000-8000-000000000001', 'Tech', 'DTTD#42', NULL, '2024-03-17', '2024-03-17'),
  ('ae000021-0000-4000-8000-000000000021', 'b0000010-0000-4000-8000-000000000010', 'c0000004-0000-4000-8000-000000000002', 'Head Tech', 'DTTD#43', NULL, '2024-09-22', '2024-09-22'),

  -- User 12 (Jessica Hernandez) — 2 prior weekends (Level 2)
  ('ae000022-0000-4000-8000-000000000022', 'b0000012-0000-4000-8000-000000000012', 'c0000002-0000-4000-8000-000000000001', 'Prayer', 'DTTD#42', NULL, '2024-03-17', '2024-03-17'),
  ('ae000023-0000-4000-8000-000000000023', 'b0000012-0000-4000-8000-000000000012', NULL, 'Chapel', 'TRES_DIAS#18', NULL, '2023-03-25', '2023-03-25'),

  -- User 15 (Christopher Wilson) — 2 prior weekends (Level 2) — serves both weekends same role
  ('ae000024-0000-4000-8000-000000000024', 'b0000015-0000-4000-8000-000000000015', 'c0000005-0000-4000-8000-000000000003', 'Tech', 'DTTD#44', NULL, '2025-03-16', '2025-03-16'),
  ('ae000025-0000-4000-8000-000000000025', 'b0000015-0000-4000-8000-000000000015', NULL, 'Tech', 'KAIROS#12', NULL, '2024-06-10', '2024-06-10');

-- =============================================================================
-- SECTION: Team Form Completions for DTTD #45
-- =============================================================================
-- Most members have all 5 forms complete. 4 members have incomplete forms.
-- Incomplete: user 13 (William, 0 forms), user 25 (Kevin, 2 forms),
--             user 18 (Stephanie, 0 forms), user 24 (Melissa, 3 forms)

INSERT INTO public.team_form_completions (id, weekend_group_member_id, form_type, completed_at) VALUES
  -- User 3 (John Smith) — all 5 forms
  ('af000001-0000-4000-8000-000000000001', 'ab000001-0000-4000-8000-000000000001', 'statement_of_belief', '2025-06-10'),
  ('af000002-0000-4000-8000-000000000002', 'ab000001-0000-4000-8000-000000000001', 'commitment_form', '2025-06-10'),
  ('af000003-0000-4000-8000-000000000003', 'ab000001-0000-4000-8000-000000000001', 'release_of_claim', '2025-06-11'),
  ('af000004-0000-4000-8000-000000000004', 'ab000001-0000-4000-8000-000000000001', 'camp_waiver', '2025-06-11'),
  ('af000005-0000-4000-8000-000000000005', 'ab000001-0000-4000-8000-000000000001', 'info_sheet', '2025-06-12'),
  -- User 5 (Michael Johnson) — all 5 forms
  ('af000006-0000-4000-8000-000000000006', 'ab000002-0000-4000-8000-000000000002', 'statement_of_belief', '2025-06-08'),
  ('af000007-0000-4000-8000-000000000007', 'ab000002-0000-4000-8000-000000000002', 'commitment_form', '2025-06-08'),
  ('af000008-0000-4000-8000-000000000008', 'ab000002-0000-4000-8000-000000000002', 'release_of_claim', '2025-06-09'),
  ('af000009-0000-4000-8000-000000000009', 'ab000002-0000-4000-8000-000000000002', 'camp_waiver', '2025-06-09'),
  ('af000010-0000-4000-8000-000000000010', 'ab000002-0000-4000-8000-000000000002', 'info_sheet', '2025-06-10'),
  -- User 7 (David Brown) — all 5 forms
  ('af000011-0000-4000-8000-000000000011', 'ab000003-0000-4000-8000-000000000003', 'statement_of_belief', '2025-06-12'),
  ('af000012-0000-4000-8000-000000000012', 'ab000003-0000-4000-8000-000000000003', 'commitment_form', '2025-06-12'),
  ('af000013-0000-4000-8000-000000000013', 'ab000003-0000-4000-8000-000000000003', 'release_of_claim', '2025-06-13'),
  ('af000014-0000-4000-8000-000000000014', 'ab000003-0000-4000-8000-000000000003', 'camp_waiver', '2025-06-13'),
  ('af000015-0000-4000-8000-000000000015', 'ab000003-0000-4000-8000-000000000003', 'info_sheet', '2025-06-14'),
  -- User 9 (James Garcia) — all 5 forms
  ('af000016-0000-4000-8000-000000000016', 'ab000004-0000-4000-8000-000000000004', 'statement_of_belief', '2025-06-15'),
  ('af000017-0000-4000-8000-000000000017', 'ab000004-0000-4000-8000-000000000004', 'commitment_form', '2025-06-15'),
  ('af000018-0000-4000-8000-000000000018', 'ab000004-0000-4000-8000-000000000004', 'release_of_claim', '2025-06-16'),
  ('af000019-0000-4000-8000-000000000019', 'ab000004-0000-4000-8000-000000000004', 'camp_waiver', '2025-06-16'),
  ('af000020-0000-4000-8000-000000000020', 'ab000004-0000-4000-8000-000000000004', 'info_sheet', '2025-06-17'),
  -- User 11 (Robert Rodriguez) — all 5 forms
  ('af000021-0000-4000-8000-000000000021', 'ab000005-0000-4000-8000-000000000005', 'statement_of_belief', '2025-06-10'),
  ('af000022-0000-4000-8000-000000000022', 'ab000005-0000-4000-8000-000000000005', 'commitment_form', '2025-06-10'),
  ('af000023-0000-4000-8000-000000000023', 'ab000005-0000-4000-8000-000000000005', 'release_of_claim', '2025-06-11'),
  ('af000024-0000-4000-8000-000000000024', 'ab000005-0000-4000-8000-000000000005', 'camp_waiver', '2025-06-11'),
  ('af000025-0000-4000-8000-000000000025', 'ab000005-0000-4000-8000-000000000005', 'info_sheet', '2025-06-12'),
  -- User 13 (William Lopez) — NO forms (incomplete)
  -- User 25 (Kevin White) — 2 forms only (incomplete)
  ('af000026-0000-4000-8000-000000000026', 'ab000010-0000-4000-8000-000000000010', 'statement_of_belief', '2025-06-20'),
  ('af000027-0000-4000-8000-000000000027', 'ab000010-0000-4000-8000-000000000010', 'commitment_form', '2025-06-20'),
  -- User 15 (Christopher Wilson, both weekends) — all 5 forms
  ('af000028-0000-4000-8000-000000000028', 'ab000011-0000-4000-8000-000000000011', 'statement_of_belief', '2025-06-14'),
  ('af000029-0000-4000-8000-000000000029', 'ab000011-0000-4000-8000-000000000011', 'commitment_form', '2025-06-14'),
  ('af000030-0000-4000-8000-000000000030', 'ab000011-0000-4000-8000-000000000011', 'release_of_claim', '2025-06-15'),
  ('af000031-0000-4000-8000-000000000031', 'ab000011-0000-4000-8000-000000000011', 'camp_waiver', '2025-06-15'),
  ('af000032-0000-4000-8000-000000000032', 'ab000011-0000-4000-8000-000000000011', 'info_sheet', '2025-06-16'),
  -- User 17 (Matthew Thomas, both weekends) — all 5 forms
  ('af000033-0000-4000-8000-000000000033', 'ab000012-0000-4000-8000-000000000012', 'statement_of_belief', '2025-06-16'),
  ('af000034-0000-4000-8000-000000000034', 'ab000012-0000-4000-8000-000000000012', 'commitment_form', '2025-06-16'),
  ('af000035-0000-4000-8000-000000000035', 'ab000012-0000-4000-8000-000000000012', 'release_of_claim', '2025-06-17'),
  ('af000036-0000-4000-8000-000000000036', 'ab000012-0000-4000-8000-000000000012', 'camp_waiver', '2025-06-17'),
  ('af000037-0000-4000-8000-000000000037', 'ab000012-0000-4000-8000-000000000012', 'info_sheet', '2025-06-18'),
  -- User 19 (Daniel Moore) — all 5 forms
  ('af000038-0000-4000-8000-000000000038', 'ab000007-0000-4000-8000-000000000007', 'statement_of_belief', '2025-06-18'),
  ('af000039-0000-4000-8000-000000000039', 'ab000007-0000-4000-8000-000000000007', 'commitment_form', '2025-06-18'),
  ('af000040-0000-4000-8000-000000000040', 'ab000007-0000-4000-8000-000000000007', 'release_of_claim', '2025-06-19'),
  ('af000041-0000-4000-8000-000000000041', 'ab000007-0000-4000-8000-000000000007', 'camp_waiver', '2025-06-19'),
  ('af000042-0000-4000-8000-000000000042', 'ab000007-0000-4000-8000-000000000007', 'info_sheet', '2025-06-20'),
  -- User 21 (Andrew Martin) — all 5 forms
  ('af000043-0000-4000-8000-000000000043', 'ab000008-0000-4000-8000-000000000008', 'statement_of_belief', '2025-06-12'),
  ('af000044-0000-4000-8000-000000000044', 'ab000008-0000-4000-8000-000000000008', 'commitment_form', '2025-06-12'),
  ('af000045-0000-4000-8000-000000000045', 'ab000008-0000-4000-8000-000000000008', 'release_of_claim', '2025-06-13'),
  ('af000046-0000-4000-8000-000000000046', 'ab000008-0000-4000-8000-000000000008', 'camp_waiver', '2025-06-13'),
  ('af000047-0000-4000-8000-000000000047', 'ab000008-0000-4000-8000-000000000008', 'info_sheet', '2025-06-14'),
  -- User 23 (Joshua Perez) — all 5 forms
  ('af000048-0000-4000-8000-000000000048', 'ab000009-0000-4000-8000-000000000009', 'statement_of_belief', '2025-06-15'),
  ('af000049-0000-4000-8000-000000000049', 'ab000009-0000-4000-8000-000000000009', 'commitment_form', '2025-06-15'),
  ('af000050-0000-4000-8000-000000000050', 'ab000009-0000-4000-8000-000000000009', 'release_of_claim', '2025-06-16'),
  ('af000051-0000-4000-8000-000000000051', 'ab000009-0000-4000-8000-000000000009', 'camp_waiver', '2025-06-16'),
  ('af000052-0000-4000-8000-000000000052', 'ab000009-0000-4000-8000-000000000009', 'info_sheet', '2025-06-17'),
  -- User 4 (Jane Doe) — all 5 forms
  ('af000053-0000-4000-8000-000000000053', 'ab000013-0000-4000-8000-000000000013', 'statement_of_belief', '2025-06-08'),
  ('af000054-0000-4000-8000-000000000054', 'ab000013-0000-4000-8000-000000000013', 'commitment_form', '2025-06-08'),
  ('af000055-0000-4000-8000-000000000055', 'ab000013-0000-4000-8000-000000000013', 'release_of_claim', '2025-06-09'),
  ('af000056-0000-4000-8000-000000000056', 'ab000013-0000-4000-8000-000000000013', 'camp_waiver', '2025-06-09'),
  ('af000057-0000-4000-8000-000000000057', 'ab000013-0000-4000-8000-000000000013', 'info_sheet', '2025-06-10'),
  -- User 6 (Sarah Williams) — all 5 forms
  ('af000058-0000-4000-8000-000000000058', 'ab000014-0000-4000-8000-000000000014', 'statement_of_belief', '2025-06-10'),
  ('af000059-0000-4000-8000-000000000059', 'ab000014-0000-4000-8000-000000000014', 'commitment_form', '2025-06-10'),
  ('af000060-0000-4000-8000-000000000060', 'ab000014-0000-4000-8000-000000000014', 'release_of_claim', '2025-06-11'),
  ('af000061-0000-4000-8000-000000000061', 'ab000014-0000-4000-8000-000000000014', 'camp_waiver', '2025-06-11'),
  ('af000062-0000-4000-8000-000000000062', 'ab000014-0000-4000-8000-000000000014', 'info_sheet', '2025-06-12'),
  -- User 8 (Emily Jones) — all 5 forms
  ('af000063-0000-4000-8000-000000000063', 'ab000015-0000-4000-8000-000000000015', 'statement_of_belief', '2025-06-14'),
  ('af000064-0000-4000-8000-000000000064', 'ab000015-0000-4000-8000-000000000015', 'commitment_form', '2025-06-14'),
  ('af000065-0000-4000-8000-000000000065', 'ab000015-0000-4000-8000-000000000015', 'release_of_claim', '2025-06-15'),
  ('af000066-0000-4000-8000-000000000066', 'ab000015-0000-4000-8000-000000000015', 'camp_waiver', '2025-06-15'),
  ('af000067-0000-4000-8000-000000000067', 'ab000015-0000-4000-8000-000000000015', 'info_sheet', '2025-06-16'),
  -- User 10 (Amanda Martinez) — all 5 forms
  ('af000068-0000-4000-8000-000000000068', 'ab000016-0000-4000-8000-000000000016', 'statement_of_belief', '2025-06-12'),
  ('af000069-0000-4000-8000-000000000069', 'ab000016-0000-4000-8000-000000000016', 'commitment_form', '2025-06-12'),
  ('af000070-0000-4000-8000-000000000070', 'ab000016-0000-4000-8000-000000000016', 'release_of_claim', '2025-06-13'),
  ('af000071-0000-4000-8000-000000000071', 'ab000016-0000-4000-8000-000000000016', 'camp_waiver', '2025-06-13'),
  ('af000072-0000-4000-8000-000000000072', 'ab000016-0000-4000-8000-000000000016', 'info_sheet', '2025-06-14'),
  -- User 12 (Jessica Hernandez) — all 5 forms
  ('af000073-0000-4000-8000-000000000073', 'ab000017-0000-4000-8000-000000000017', 'statement_of_belief', '2025-06-16'),
  ('af000074-0000-4000-8000-000000000074', 'ab000017-0000-4000-8000-000000000017', 'commitment_form', '2025-06-16'),
  ('af000075-0000-4000-8000-000000000075', 'ab000017-0000-4000-8000-000000000017', 'release_of_claim', '2025-06-17'),
  ('af000076-0000-4000-8000-000000000076', 'ab000017-0000-4000-8000-000000000017', 'camp_waiver', '2025-06-17'),
  ('af000077-0000-4000-8000-000000000077', 'ab000017-0000-4000-8000-000000000017', 'info_sheet', '2025-06-18'),
  -- User 14 (Ashley Gonzalez) — all 5 forms
  ('af000078-0000-4000-8000-000000000078', 'ab000018-0000-4000-8000-000000000018', 'statement_of_belief', '2025-06-18'),
  ('af000079-0000-4000-8000-000000000079', 'ab000018-0000-4000-8000-000000000018', 'commitment_form', '2025-06-18'),
  ('af000080-0000-4000-8000-000000000080', 'ab000018-0000-4000-8000-000000000018', 'release_of_claim', '2025-06-19'),
  ('af000081-0000-4000-8000-000000000081', 'ab000018-0000-4000-8000-000000000018', 'camp_waiver', '2025-06-19'),
  ('af000082-0000-4000-8000-000000000082', 'ab000018-0000-4000-8000-000000000018', 'info_sheet', '2025-06-20'),
  -- User 18 (Stephanie Taylor) — NO forms (incomplete)
  -- User 20 (Michelle Jackson) — all 5 forms
  ('af000083-0000-4000-8000-000000000083', 'ab000020-0000-4000-8000-000000000020', 'statement_of_belief', '2025-06-14'),
  ('af000084-0000-4000-8000-000000000084', 'ab000020-0000-4000-8000-000000000020', 'commitment_form', '2025-06-14'),
  ('af000085-0000-4000-8000-000000000085', 'ab000020-0000-4000-8000-000000000020', 'release_of_claim', '2025-06-15'),
  ('af000086-0000-4000-8000-000000000086', 'ab000020-0000-4000-8000-000000000020', 'camp_waiver', '2025-06-15'),
  ('af000087-0000-4000-8000-000000000087', 'ab000020-0000-4000-8000-000000000020', 'info_sheet', '2025-06-16'),
  -- User 22 (Kimberly Lee) — all 5 forms
  ('af000088-0000-4000-8000-000000000088', 'ab000021-0000-4000-8000-000000000021', 'statement_of_belief', '2025-06-16'),
  ('af000089-0000-4000-8000-000000000089', 'ab000021-0000-4000-8000-000000000021', 'commitment_form', '2025-06-16'),
  ('af000090-0000-4000-8000-000000000090', 'ab000021-0000-4000-8000-000000000021', 'release_of_claim', '2025-06-17'),
  ('af000091-0000-4000-8000-000000000091', 'ab000021-0000-4000-8000-000000000021', 'camp_waiver', '2025-06-17'),
  ('af000092-0000-4000-8000-000000000092', 'ab000021-0000-4000-8000-000000000021', 'info_sheet', '2025-06-18'),
  -- User 24 (Melissa Thompson) — 3 forms only (incomplete)
  ('af000093-0000-4000-8000-000000000093', 'ab000022-0000-4000-8000-000000000022', 'statement_of_belief', '2025-06-20'),
  ('af000094-0000-4000-8000-000000000094', 'ab000022-0000-4000-8000-000000000022', 'commitment_form', '2025-06-20'),
  ('af000095-0000-4000-8000-000000000095', 'ab000022-0000-4000-8000-000000000022', 'release_of_claim', '2025-06-21');

-- =============================================================================
-- SECTION: Team Member Payments for DTTD #45
-- =============================================================================
-- Manual cash/check payments targeting weekend_group_member.
-- Most members paid, a few unpaid (William Lopez, Stephanie Taylor, Kevin White, Melissa Thompson)

INSERT INTO public.payment_transaction (id, type, target_type, target_id, weekend_id, payment_intent_id, gross_amount, net_amount, stripe_fee, payment_method, payment_owner, notes, created_at) VALUES
  -- Men's roster payments
  ('cd000001-0000-4000-8000-000000000001', 'fee', 'weekend_group_member', 'ab000001-0000-4000-8000-000000000001', NULL, 'manual_team_001', 75.00, NULL, NULL, 'cash', 'John Smith', 'Cash at team meeting', '2025-07-01'),
  ('cd000002-0000-4000-8000-000000000002', 'fee', 'weekend_group_member', 'ab000002-0000-4000-8000-000000000002', NULL, 'manual_team_002', 75.00, NULL, NULL, 'check', 'Michael Johnson', 'Check #8001', '2025-07-02'),
  ('cd000003-0000-4000-8000-000000000003', 'fee', 'weekend_group_member', 'ab000003-0000-4000-8000-000000000003', NULL, 'manual_team_003', 75.00, NULL, NULL, 'cash', 'David Brown', 'Cash at team meeting', '2025-07-03'),
  ('cd000004-0000-4000-8000-000000000004', 'fee', 'weekend_group_member', 'ab000004-0000-4000-8000-000000000004', NULL, 'manual_team_004', 75.00, NULL, NULL, 'cash', 'James Garcia', NULL, '2025-07-04'),
  ('cd000005-0000-4000-8000-000000000005', 'fee', 'weekend_group_member', 'ab000005-0000-4000-8000-000000000005', NULL, 'manual_team_005', 75.00, NULL, NULL, 'check', 'Robert Rodriguez', 'Check #8002', '2025-07-05'),
  -- User 13 (William Lopez) — NO payment
  ('cd000006-0000-4000-8000-000000000006', 'fee', 'weekend_group_member', 'ab000011-0000-4000-8000-000000000011', NULL, 'manual_team_006', 75.00, NULL, NULL, 'cash', 'Christopher Wilson', NULL, '2025-07-07'),
  ('cd000007-0000-4000-8000-000000000007', 'fee', 'weekend_group_member', 'ab000012-0000-4000-8000-000000000012', NULL, 'manual_team_007', 75.00, NULL, NULL, 'check', 'Matthew Thomas', 'Check #8003', '2025-07-08'),
  ('cd000008-0000-4000-8000-000000000008', 'fee', 'weekend_group_member', 'ab000007-0000-4000-8000-000000000007', NULL, 'manual_team_008', 75.00, NULL, NULL, 'cash', 'Daniel Moore', NULL, '2025-07-09'),
  ('cd000009-0000-4000-8000-000000000009', 'fee', 'weekend_group_member', 'ab000008-0000-4000-8000-000000000008', NULL, 'manual_team_009', 75.00, NULL, NULL, 'cash', 'Andrew Martin', NULL, '2025-07-10'),
  ('cd000010-0000-4000-8000-000000000010', 'fee', 'weekend_group_member', 'ab000009-0000-4000-8000-000000000009', NULL, 'manual_team_010', 75.00, NULL, NULL, 'check', 'Joshua Perez', 'Check #8004', '2025-07-11'),
  -- User 25 (Kevin White) — NO payment
  -- Women's roster payments
  ('cd000011-0000-4000-8000-000000000011', 'fee', 'weekend_group_member', 'ab000013-0000-4000-8000-000000000013', NULL, 'manual_team_011', 75.00, NULL, NULL, 'cash', 'Jane Doe', NULL, '2025-07-01'),
  ('cd000012-0000-4000-8000-000000000012', 'fee', 'weekend_group_member', 'ab000014-0000-4000-8000-000000000014', NULL, 'manual_team_012', 75.00, NULL, NULL, 'check', 'Sarah Williams', 'Check #8005', '2025-07-02'),
  ('cd000013-0000-4000-8000-000000000013', 'fee', 'weekend_group_member', 'ab000015-0000-4000-8000-000000000015', NULL, 'manual_team_013', 75.00, NULL, NULL, 'cash', 'Emily Jones', NULL, '2025-07-03'),
  ('cd000014-0000-4000-8000-000000000014', 'fee', 'weekend_group_member', 'ab000016-0000-4000-8000-000000000016', NULL, 'manual_team_014', 75.00, NULL, NULL, 'cash', 'Amanda Martinez', NULL, '2025-07-04'),
  ('cd000015-0000-4000-8000-000000000015', 'fee', 'weekend_group_member', 'ab000017-0000-4000-8000-000000000017', NULL, 'manual_team_015', 75.00, NULL, NULL, 'check', 'Jessica Hernandez', 'Check #8006', '2025-07-05'),
  ('cd000016-0000-4000-8000-000000000016', 'fee', 'weekend_group_member', 'ab000018-0000-4000-8000-000000000018', NULL, 'manual_team_016', 75.00, NULL, NULL, 'cash', 'Ashley Gonzalez', NULL, '2025-07-06'),
  -- User 18 (Stephanie Taylor) — NO payment
  ('cd000017-0000-4000-8000-000000000017', 'fee', 'weekend_group_member', 'ab000020-0000-4000-8000-000000000020', NULL, 'manual_team_017', 75.00, NULL, NULL, 'cash', 'Michelle Jackson', NULL, '2025-07-10'),
  ('cd000018-0000-4000-8000-000000000018', 'fee', 'weekend_group_member', 'ab000021-0000-4000-8000-000000000021', NULL, 'manual_team_018', 75.00, NULL, NULL, 'check', 'Kimberly Lee', 'Check #8007', '2025-07-11');
  -- User 24 (Melissa Thompson) — NO payment

-- =============================================================================
-- SECTION: Candidate Payments (payment_transaction table)
-- =============================================================================
-- Payment records for candidates across weekends.
-- Mix of stripe, cash, and check payments with varying amounts.

-- Men's Weekend #42 (FINISHED - Spring 2024) — most confirmed candidates paid
INSERT INTO public.payment_transaction (id, type, target_type, target_id, weekend_id, payment_intent_id, gross_amount, net_amount, stripe_fee, payment_method, payment_owner, notes, created_at) VALUES
  ('cc000001-0000-4000-8000-000000000001', 'fee', 'candidate', 'e0000001-0000-4000-8000-000000000001', 'c0000001-0000-4000-8000-000000000001', 'pi_3PaCandFee001abc', 210.00, 200.91, 9.09, 'stripe', 'John Smith', NULL, '2024-02-12 09:30:00'),
  ('cc000002-0000-4000-8000-000000000002', 'fee', 'candidate', 'e0000002-0000-4000-8000-000000000002', 'c0000001-0000-4000-8000-000000000001', 'pi_3PaCandFee002def', 210.00, 200.91, 9.09, 'stripe', 'Jane Doe', NULL, '2024-02-13 14:15:00'),
  ('cc000003-0000-4000-8000-000000000003', 'fee', 'candidate', 'e0000003-0000-4000-8000-000000000003', 'c0000001-0000-4000-8000-000000000001', 'manual_cash_c003', 200.00, NULL, NULL, 'cash', 'Michael Johnson', 'Cash from sponsor at team meeting', '2024-02-15 19:30:00'),
  ('cc000004-0000-4000-8000-000000000004', 'fee', 'candidate', 'e0000004-0000-4000-8000-000000000004', 'c0000001-0000-4000-8000-000000000001', 'pi_3PaCandFee004ghi', 210.00, 200.91, 9.09, 'stripe', 'Self Payment', NULL, '2024-02-16 10:00:00'),
  ('cc000005-0000-4000-8000-000000000005', 'fee', 'candidate', 'e0000005-0000-4000-8000-000000000005', 'c0000001-0000-4000-8000-000000000001', 'manual_check_c005', 200.00, NULL, NULL, 'check', 'Sarah Williams', 'Check #3456 from sponsor', '2024-02-18 11:30:00'),
  ('cc000006-0000-4000-8000-000000000006', 'fee', 'candidate', 'e0000006-0000-4000-8000-000000000006', 'c0000001-0000-4000-8000-000000000001', 'pi_3PaCandFee006jkl', 210.00, 200.91, 9.09, 'stripe', 'David Brown', NULL, '2024-02-19 08:45:00'),
  ('cc000007-0000-4000-8000-000000000007', 'fee', 'candidate', 'e0000007-0000-4000-8000-000000000007', 'c0000001-0000-4000-8000-000000000001', 'pi_3PaCandFee007mno', 210.00, 200.91, 9.09, 'stripe', 'Emily Jones', NULL, '2024-02-20 16:20:00'),
  ('cc000008-0000-4000-8000-000000000008', 'fee', 'candidate', 'e0000008-0000-4000-8000-000000000008', 'c0000001-0000-4000-8000-000000000001', 'pi_3PaCandFee008pqr', 210.00, 200.91, 9.09, 'stripe', 'James Garcia', NULL, '2024-02-21 13:00:00'),
  ('cc000009-0000-4000-8000-000000000009', 'fee', 'candidate', 'e0000009-0000-4000-8000-000000000009', 'c0000001-0000-4000-8000-000000000001', 'pi_3PaCandFee009stu', 210.00, 200.91, 9.09, 'stripe', 'Robert Wilson', NULL, '2024-02-22 10:15:00'),
  ('cc000010-0000-4000-8000-000000000010', 'fee', 'candidate', 'e0000010-0000-4000-8000-000000000010', 'c0000001-0000-4000-8000-000000000001', 'manual_cash_c010', 200.00, NULL, NULL, 'cash', 'Thomas Anderson', 'Cash at registration', '2024-02-23 14:00:00'),
  ('cc000011-0000-4000-8000-000000000011', 'fee', 'candidate', 'e0000011-0000-4000-8000-000000000011', 'c0000001-0000-4000-8000-000000000001', 'pi_3PaCandFee011vwx', 210.00, 200.91, 9.09, 'stripe', 'Daniel Taylor', NULL, '2024-02-24 09:00:00'),
  ('cc000012-0000-4000-8000-000000000012', 'fee', 'candidate', 'e0000012-0000-4000-8000-000000000012', 'c0000001-0000-4000-8000-000000000001', 'manual_check_c012', 200.00, NULL, NULL, 'check', 'Mark Thomas', 'Check #7891 deposited', '2024-02-25 11:30:00'),
  ('cc000013-0000-4000-8000-000000000013', 'fee', 'candidate', 'e0000013-0000-4000-8000-000000000013', 'c0000001-0000-4000-8000-000000000001', 'pi_3PaCandFee013yza', 210.00, 200.91, 9.09, 'stripe', 'Paul Harris', NULL, '2024-02-26 15:45:00'),
  ('cc000014-0000-4000-8000-000000000014', 'fee', 'candidate', 'e0000014-0000-4000-8000-000000000014', 'c0000001-0000-4000-8000-000000000001', 'pi_3PaCandFee014bcd', 210.00, 200.91, 9.09, 'stripe', 'Steven Clark', NULL, '2024-02-27 08:20:00'),
  ('cc000015-0000-4000-8000-000000000015', 'fee', 'candidate', 'e0000015-0000-4000-8000-000000000015', 'c0000001-0000-4000-8000-000000000001', 'manual_cash_c015', 200.00, NULL, NULL, 'cash', 'Kevin Lewis', 'Cash from candidate', '2024-02-28 17:00:00'),
  ('cc000016-0000-4000-8000-000000000016', 'fee', 'candidate', 'e0000016-0000-4000-8000-000000000016', 'c0000001-0000-4000-8000-000000000001', 'pi_3PaCandFee016efg', 210.00, 200.91, 9.09, 'stripe', 'Brian Robinson', NULL, '2024-03-01 10:30:00'),
  ('cc000017-0000-4000-8000-000000000017', 'fee', 'candidate', 'e0000017-0000-4000-8000-000000000017', 'c0000001-0000-4000-8000-000000000001', 'pi_3PaCandFee017hij', 210.00, 200.91, 9.09, 'stripe', 'George Walker', NULL, '2024-03-02 13:15:00'),
  ('cc000018-0000-4000-8000-000000000018', 'fee', 'candidate', 'e0000018-0000-4000-8000-000000000018', 'c0000001-0000-4000-8000-000000000001', 'manual_check_c018', 200.00, NULL, NULL, 'check', 'Edward Hall', 'Check #2345 from sponsor', '2024-03-03 09:45:00'),
  ('cc000019-0000-4000-8000-000000000019', 'fee', 'candidate', 'e0000019-0000-4000-8000-000000000019', 'c0000001-0000-4000-8000-000000000001', 'pi_3PaCandFee019klm', 210.00, 200.91, 9.09, 'stripe', 'Ronald Allen', NULL, '2024-03-04 14:30:00'),
  ('cc000020-0000-4000-8000-000000000020', 'fee', 'candidate', 'e0000020-0000-4000-8000-000000000020', 'c0000001-0000-4000-8000-000000000001', 'pi_3PaCandFee020nop', 210.00, 200.91, 9.09, 'stripe', 'Timothy Young', NULL, '2024-03-05 11:00:00');
  -- Candidates e0000021-024 left unpaid for variety

-- Women's Weekend #42 (FINISHED - Spring 2024) — most confirmed candidates paid
INSERT INTO public.payment_transaction (id, type, target_type, target_id, weekend_id, payment_intent_id, gross_amount, net_amount, stripe_fee, payment_method, payment_owner, notes, created_at) VALUES
  ('cc000021-0000-4000-8000-000000000021', 'fee', 'candidate', 'e0000025-0000-4000-8000-000000000025', 'c0000002-0000-4000-8000-000000000001', 'pi_3PaCandFee025stu', 210.00, 200.91, 9.09, 'stripe', 'Amanda Martinez', NULL, '2024-02-12 10:00:00'),
  ('cc000022-0000-4000-8000-000000000022', 'fee', 'candidate', 'e0000026-0000-4000-8000-000000000026', 'c0000002-0000-4000-8000-000000000001', 'manual_cash_c026', 200.00, NULL, NULL, 'cash', 'Robert Rodriguez', 'Cash payment at registration', '2024-02-14 18:00:00'),
  ('cc000023-0000-4000-8000-000000000023', 'fee', 'candidate', 'e0000027-0000-4000-8000-000000000027', 'c0000002-0000-4000-8000-000000000001', 'pi_3PaCandFee027vwx', 210.00, 200.91, 9.09, 'stripe', 'Jessica Hernandez', NULL, '2024-02-15 09:15:00'),
  ('cc000024-0000-4000-8000-000000000024', 'fee', 'candidate', 'e0000028-0000-4000-8000-000000000028', 'c0000002-0000-4000-8000-000000000001', 'pi_3PaCandFee028yza', 210.00, 200.91, 9.09, 'stripe', 'William Lopez', NULL, '2024-02-17 14:45:00'),
  ('cc000025-0000-4000-8000-000000000025', 'fee', 'candidate', 'e0000029-0000-4000-8000-000000000029', 'c0000002-0000-4000-8000-000000000001', 'manual_check_c029', 200.00, NULL, NULL, 'check', 'Ashley Gonzalez', 'Check #7890 from sponsor', '2024-02-19 10:30:00'),
  ('cc000026-0000-4000-8000-000000000026', 'fee', 'candidate', 'e0000030-0000-4000-8000-000000000030', 'c0000002-0000-4000-8000-000000000001', 'pi_3PaCandFee030bcd', 210.00, 200.91, 9.09, 'stripe', 'Christopher Wilson', NULL, '2024-02-20 11:00:00'),
  ('cc000027-0000-4000-8000-000000000027', 'fee', 'candidate', 'e0000031-0000-4000-8000-000000000031', 'c0000002-0000-4000-8000-000000000001', 'pi_3PaCandFee031efg', 210.00, 200.91, 9.09, 'stripe', 'Self Payment', NULL, '2024-02-22 15:30:00'),
  ('cc000028-0000-4000-8000-000000000028', 'fee', 'candidate', 'e0000032-0000-4000-8000-000000000032', 'c0000002-0000-4000-8000-000000000001', 'pi_3PaCandFee032hij', 210.00, 200.91, 9.09, 'stripe', 'Anonymous Donor', 'Scholarship from community fund', '2024-02-23 09:00:00'),
  ('cc000029-0000-4000-8000-000000000029', 'fee', 'candidate', 'e0000033-0000-4000-8000-000000000033', 'c0000002-0000-4000-8000-000000000001', 'pi_3PaCandFee033klm', 210.00, 200.91, 9.09, 'stripe', 'Patricia Davis', NULL, '2024-02-24 12:00:00'),
  ('cc000030-0000-4000-8000-000000000030', 'fee', 'candidate', 'e0000034-0000-4000-8000-000000000034', 'c0000002-0000-4000-8000-000000000001', 'manual_cash_c034', 200.00, NULL, NULL, 'cash', 'Linda Moore', 'Cash from sponsor', '2024-02-25 14:30:00'),
  ('cc000031-0000-4000-8000-000000000031', 'fee', 'candidate', 'e0000035-0000-4000-8000-000000000035', 'c0000002-0000-4000-8000-000000000001', 'pi_3PaCandFee035nop', 210.00, 200.91, 9.09, 'stripe', 'Barbara Jackson', NULL, '2024-02-26 09:30:00'),
  ('cc000032-0000-4000-8000-000000000032', 'fee', 'candidate', 'e0000036-0000-4000-8000-000000000036', 'c0000002-0000-4000-8000-000000000001', 'manual_check_c036', 200.00, NULL, NULL, 'check', 'Elizabeth White', 'Check #4567 deposited', '2024-02-27 16:15:00'),
  ('cc000033-0000-4000-8000-000000000033', 'fee', 'candidate', 'e0000037-0000-4000-8000-000000000037', 'c0000002-0000-4000-8000-000000000001', 'pi_3PaCandFee037qrs', 210.00, 200.91, 9.09, 'stripe', 'Jennifer Harris', NULL, '2024-02-28 10:00:00'),
  ('cc000034-0000-4000-8000-000000000034', 'fee', 'candidate', 'e0000038-0000-4000-8000-000000000038', 'c0000002-0000-4000-8000-000000000001', 'pi_3PaCandFee038tuv', 210.00, 200.91, 9.09, 'stripe', 'Maria Martin', NULL, '2024-03-01 08:45:00'),
  ('cc000035-0000-4000-8000-000000000035', 'fee', 'candidate', 'e0000039-0000-4000-8000-000000000039', 'c0000002-0000-4000-8000-000000000001', 'pi_3PaCandFee039wxy', 210.00, 200.91, 9.09, 'stripe', 'Susan Thompson', NULL, '2024-03-02 11:30:00'),
  ('cc000036-0000-4000-8000-000000000036', 'fee', 'candidate', 'e0000040-0000-4000-8000-000000000040', 'c0000002-0000-4000-8000-000000000001', 'manual_cash_c040', 200.00, NULL, NULL, 'cash', 'Margaret Anderson', 'Cash at team meeting', '2024-03-03 19:00:00'),
  ('cc000037-0000-4000-8000-000000000037', 'fee', 'candidate', 'e0000041-0000-4000-8000-000000000041', 'c0000002-0000-4000-8000-000000000001', 'pi_3PaCandFee041zab', 210.00, 200.91, 9.09, 'stripe', 'Dorothy Taylor', NULL, '2024-03-04 13:00:00'),
  ('cc000038-0000-4000-8000-000000000038', 'fee', 'candidate', 'e0000042-0000-4000-8000-000000000042', 'c0000002-0000-4000-8000-000000000001', 'pi_3PaCandFee042cde', 210.00, 200.91, 9.09, 'stripe', 'Lisa Brown', NULL, '2024-03-05 15:30:00');
  -- Candidates e0000043-048 left unpaid for variety

-- Men's Weekend #45 (ACTIVE - Fall 2025) — confirmed have payments, awaiting_payment have partial/none
INSERT INTO public.payment_transaction (id, type, target_type, target_id, weekend_id, payment_intent_id, gross_amount, net_amount, stripe_fee, payment_method, payment_owner, notes, created_at) VALUES
  -- Confirmed candidates — all paid in full
  ('cc000039-0000-4000-8000-000000000039', 'fee', 'candidate', 'e1000100-0000-4000-8000-000000000100', 'c0000007-0000-4000-8000-000000000004', 'pi_3PbCandFee100abc', 210.00, 200.91, 9.09, 'stripe', 'John Smith', NULL, '2025-06-15 10:00:00'),
  ('cc000040-0000-4000-8000-000000000040', 'fee', 'candidate', 'e1000101-0000-4000-8000-000000000101', 'c0000007-0000-4000-8000-000000000004', 'manual_cash_c101', 200.00, NULL, NULL, 'cash', 'Michael Johnson', 'Cash at team meeting', '2025-06-18 19:30:00'),
  ('cc000041-0000-4000-8000-000000000041', 'fee', 'candidate', 'e1000102-0000-4000-8000-000000000102', 'c0000007-0000-4000-8000-000000000004', 'pi_3PbCandFee102def', 210.00, 200.91, 9.09, 'stripe', 'David Brown', NULL, '2025-06-20 14:15:00'),
  ('cc000042-0000-4000-8000-000000000042', 'fee', 'candidate', 'e1000103-0000-4000-8000-000000000103', 'c0000007-0000-4000-8000-000000000004', 'manual_check_c103', 200.00, NULL, NULL, 'check', 'Eric Adams', 'Check #5001 from sponsor', '2025-06-22 09:00:00'),
  ('cc000043-0000-4000-8000-000000000043', 'fee', 'candidate', 'e1000104-0000-4000-8000-000000000104', 'c0000007-0000-4000-8000-000000000004', 'pi_3PbCandFee104ghi', 210.00, 200.91, 9.09, 'stripe', 'Jacob Baker', NULL, '2025-06-25 11:30:00'),
  ('cc000044-0000-4000-8000-000000000044', 'fee', 'candidate', 'e1000105-0000-4000-8000-000000000105', 'c0000007-0000-4000-8000-000000000004', 'pi_3PbCandFee105jkl', 210.00, 200.91, 9.09, 'stripe', 'Samuel Rivera', NULL, '2025-06-28 16:00:00'),
  ('cc000045-0000-4000-8000-000000000045', 'fee', 'candidate', 'e1000106-0000-4000-8000-000000000106', 'c0000007-0000-4000-8000-000000000004', 'manual_cash_c106', 200.00, NULL, NULL, 'cash', 'Patrick Mitchell', 'Cash from sponsor', '2025-07-01 13:45:00'),
  ('cc000046-0000-4000-8000-000000000046', 'fee', 'candidate', 'e1000107-0000-4000-8000-000000000107', 'c0000007-0000-4000-8000-000000000004', 'pi_3PbCandFee107mno', 210.00, 200.91, 9.09, 'stripe', 'Nathan Flores', NULL, '2025-07-05 10:20:00'),
  ('cc000047-0000-4000-8000-000000000047', 'fee', 'candidate', 'e1000108-0000-4000-8000-000000000108', 'c0000007-0000-4000-8000-000000000004', 'manual_check_c108', 200.00, NULL, NULL, 'check', 'Adam Nguyen', 'Check #5002 deposited', '2025-07-08 09:15:00'),
  ('cc000048-0000-4000-8000-000000000048', 'fee', 'candidate', 'e1000109-0000-4000-8000-000000000109', 'c0000007-0000-4000-8000-000000000004', 'pi_3PbCandFee109pqr', 210.00, 200.91, 9.09, 'stripe', 'Aaron Scott', NULL, '2025-07-10 14:00:00'),
  -- Awaiting payment — one partial payment, two with no payments
  ('cc000049-0000-4000-8000-000000000049', 'fee', 'candidate', 'e1000110-0000-4000-8000-000000000110', 'c0000007-0000-4000-8000-000000000004', 'manual_cash_c110', 100.00, NULL, NULL, 'cash', 'Jane Doe', 'Partial payment — will pay rest at sendoff', '2025-07-25 18:00:00');
  -- e1000111 and e1000112 have no payments yet (awaiting payment)

-- Women's Weekend #45 (ACTIVE - Fall 2025) — confirmed have payments, awaiting_payment have partial/none
INSERT INTO public.payment_transaction (id, type, target_type, target_id, weekend_id, payment_intent_id, gross_amount, net_amount, stripe_fee, payment_method, payment_owner, notes, created_at) VALUES
  -- Confirmed candidates — all paid in full
  ('cc000050-0000-4000-8000-000000000050', 'fee', 'candidate', 'e1000122-0000-4000-8000-000000000122', 'c0000008-0000-4000-8000-000000000004', 'pi_3PbCandFee122abc', 210.00, 200.91, 9.09, 'stripe', 'Sarah Davis', NULL, '2025-06-15 10:30:00'),
  ('cc000051-0000-4000-8000-000000000051', 'fee', 'candidate', 'e1000123-0000-4000-8000-000000000123', 'c0000008-0000-4000-8000-000000000004', 'manual_cash_c123', 200.00, NULL, NULL, 'cash', 'Emily Jones', 'Cash at women''s team meeting', '2025-06-18 19:00:00'),
  ('cc000052-0000-4000-8000-000000000052', 'fee', 'candidate', 'e1000124-0000-4000-8000-000000000124', 'c0000008-0000-4000-8000-000000000004', 'pi_3PbCandFee124def', 210.00, 200.91, 9.09, 'stripe', 'Amanda Martinez', NULL, '2025-06-21 11:45:00'),
  ('cc000053-0000-4000-8000-000000000053', 'fee', 'candidate', 'e1000125-0000-4000-8000-000000000125', 'c0000008-0000-4000-8000-000000000004', 'manual_check_c125', 200.00, NULL, NULL, 'check', 'Jessica Hernandez', 'Check #6001 from sponsor', '2025-06-24 09:30:00'),
  ('cc000054-0000-4000-8000-000000000054', 'fee', 'candidate', 'e1000126-0000-4000-8000-000000000126', 'c0000008-0000-4000-8000-000000000004', 'pi_3PbCandFee126ghi', 210.00, 200.91, 9.09, 'stripe', 'Rachel Green', NULL, '2025-06-27 14:00:00'),
  ('cc000055-0000-4000-8000-000000000055', 'fee', 'candidate', 'e1000127-0000-4000-8000-000000000127', 'c0000008-0000-4000-8000-000000000004', 'pi_3PbCandFee127jkl', 210.00, 200.91, 9.09, 'stripe', 'Karen Thompson', NULL, '2025-06-30 16:30:00'),
  ('cc000056-0000-4000-8000-000000000056', 'fee', 'candidate', 'e1000128-0000-4000-8000-000000000128', 'c0000008-0000-4000-8000-000000000004', 'manual_cash_c128', 200.00, NULL, NULL, 'cash', 'Nancy Wilson', 'Cash from candidate', '2025-07-03 10:00:00'),
  ('cc000057-0000-4000-8000-000000000057', 'fee', 'candidate', 'e1000129-0000-4000-8000-000000000129', 'c0000008-0000-4000-8000-000000000004', 'pi_3PbCandFee129mno', 210.00, 200.91, 9.09, 'stripe', 'Michelle Clark', NULL, '2025-07-06 12:15:00'),
  -- Awaiting payment — one with two partial payments (split payment test case), one with no payment
  ('cc000058-0000-4000-8000-000000000058', 'fee', 'candidate', 'e1000130-0000-4000-8000-000000000130', 'c0000008-0000-4000-8000-000000000004', 'manual_cash_c130a', 100.00, NULL, NULL, 'cash', 'Sponsor Payment', 'First installment — cash', '2025-07-20 14:00:00'),
  ('cc000059-0000-4000-8000-000000000059', 'fee', 'candidate', 'e1000130-0000-4000-8000-000000000130', 'c0000008-0000-4000-8000-000000000004', 'manual_check_c130b', 50.00, NULL, NULL, 'check', 'Sponsor Payment', 'Second installment — Check #6050', '2025-08-01 09:00:00');
  -- e1000131 has no payments yet (awaiting payment)

-- =============================================================================
-- SECTION: Contact Information
-- =============================================================================
-- Contact information for key community roles (used for email notifications)

INSERT INTO "public"."contact_information" ("id", "created_at", "label", "email_address") VALUES
  ('preweekend-couple', '2025-06-21 02:48:07.983876+00', 'Pre-Weekend Couple', 'sdavisde@gmail.com');

-- =============================================================================
-- SECTION: Summary Documentation
-- =============================================================================
--
-- SEED DATA SUMMARY:
--
-- CANDIDATES SEEDED:
-- - Historic Weekend #42: 48 candidates (24 men, 24 women) - all confirmed
-- - Active Weekend #45 Men: 22 candidates across all statuses
-- - Active Weekend #45 Women: 18 candidates across all statuses
-- Total: 88 candidates
--
-- SPONSORSHIP INFO: All 88 candidates have sponsorship records
--
-- CANDIDATE INFO (completed forms):
-- - Men's: 12 confirmed + 3 awaiting payment = 15 total
-- - Women's: 8 confirmed + 2 awaiting payment = 10 total
-- Total: 25 candidate_info records
--
-- EDGE CASES COVERED:
-- Marital Status: married (spouse attended/didn't), single, divorced, widowed, separated, engaged
-- Demographics: ages 26-59, male and female
-- Faith Journey: strong believers, new believers, exploring faith, clergy
-- Medical: diabetes, heart disease, mental health (depression/anxiety), dietary restrictions,
--          chronic pain, PTSD, postpartum issues, fibromyalgia
-- Family: young children, teenagers, adult children, empty nesters, single parents,
--         blended families, deployed spouse, special needs children
-- Life Situations: career-driven, caregivers, financially struggling, grieving,
--                  marital crisis, recovery (alcoholism), military/veterans
-- Church Involvement: new attendees, regular attendees, leaders, spiritually dry despite activity
-- Social: isolated, active, unbelieving spouse, friends attending together
--
-- CANDIDATE STATUS DISTRIBUTION (Active Weekend #45):
-- Men's:
--   - confirmed: 10 (all have candidate_info)
--   - awaiting_payment: 3 (all have candidate_info)
--   - awaiting_forms: 4 (sponsorship only)
--   - sponsored: 3 (sponsorship only)
--   - rejected: 2 (sponsorship only)
--
-- Women's:
--   - confirmed: 8 (all have candidate_info)
--   - awaiting_payment: 2 (all have candidate_info)
--   - awaiting_forms: 3 (sponsorship only)
--   - sponsored: 4 (sponsorship only)
--   - rejected: 1 (sponsorship only)
