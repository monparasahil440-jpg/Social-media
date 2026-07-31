-- ============================================
-- Fix Follow Requests RLS Policies
-- ============================================
-- The previous migration (00018) used a FOR ALL policy with USING clause
-- which causes PostgREST to fail on INSERT operations because it evaluates
-- the USING expression against the new row, resulting in:
-- "new row violates row-level security policy (USING expression)"
--
-- Fix: Use separate policies for each operation type:
--   - SELECT: USING (checks existing rows)
--   - INSERT: WITH CHECK (checks new rows being inserted)
--   - UPDATE: USING (allows requester to reset to pending OR requested to approve/reject)
--   - DELETE: USING (checks existing rows before delete)

-- Drop the problematic FOR ALL policy from migration 00018
DROP POLICY IF EXISTS "Users can create or update follow requests" ON public.follow_requests;

-- Re-create the original policies from migration 00003 with proper separation

-- SELECT: Users can view follow requests they sent or received
CREATE POLICY "Users can view their own follow requests"
  ON public.follow_requests FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = requested_id);

-- INSERT: Users can create follow requests (only as the requester)
CREATE POLICY "Users can create follow requests"
  ON public.follow_requests FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

-- UPDATE:
--   - Requester can update to reset request to pending (if previously rejected)
--   - Requested user can update to approve/reject the request
CREATE POLICY "Users can update follow requests"
  ON public.follow_requests FOR UPDATE
  USING (auth.uid() = requester_id OR auth.uid() = requested_id)
  WITH CHECK (auth.uid() = requester_id OR auth.uid() = requested_id);

-- DELETE: Users can delete their own follow requests (cancel)
CREATE POLICY "Users can delete their own follow requests"
  ON public.follow_requests FOR DELETE
  USING (auth.uid() = requester_id OR auth.uid() = requested_id);