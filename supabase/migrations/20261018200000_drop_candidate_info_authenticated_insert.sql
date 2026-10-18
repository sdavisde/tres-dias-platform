-- Migration: drop the open authenticated INSERT policy on candidate_info
--
-- Candidate forms are written only by the server through the service-role
-- client (services/candidates/candidate-forms.ts), which bypasses RLS. This
-- policy (recreated TO authenticated in 20260927000001) is unused, and with
-- open signup it let any account insert a row for any candidate; the unique
-- index on candidate_id then made the real candidate's submission fail as
-- "already submitted".

DROP POLICY IF EXISTS "Allow authenticated users to insert candidate_info"
  ON public.candidate_info;
