-- ============================================
-- Fix Follow Requests RLS for Upsert Operations
-- ============================================

-- Update the INSERT policy to also allow UPSERT operations
DROP POLICY IF EXISTS "Users can create follow requests" ON public.follow_requests;

CREATE POLICY "Users can create or update follow requests"
  ON public.follow_requests
  FOR ALL
  USING (auth.uid() = requester_id)
  WITH CHECK (auth.uid() = requester_id);
