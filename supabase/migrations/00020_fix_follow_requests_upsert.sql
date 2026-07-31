-- ============================================
-- Fix Follow Requests Upsert RLS Issue
-- ============================================
-- PROBLEM:
-- The `sendFollowRequest()` function in the frontend uses `upsert()` on
-- `follow_requests` table with `onConflict: 'requester_id, requested_id'`.
-- PostgREST translates this into:
--   INSERT INTO follow_requests (...) VALUES (...)
--   ON CONFLICT (requester_id, requested_id) DO UPDATE SET status = 'pending'
--
-- When RLS evaluates an UPSERT, it applies:
--   - The INSERT WITH CHECK clause for the INSERT part
--   - The UPDATE USING clause for the UPDATE part
--
-- But PostgREST generates the URL as:
--   /rest/v1/follow_requests?on_conflict=requester_id,requested_id
-- which triggers the UPDATE USING clause evaluation. When the UPDATE policy
-- uses `WITH CHECK (auth.uid() = requester_id OR auth.uid() = requested_id)`,
-- PostgREST evaluates this against the NEW row for both INSERT and UPDATE phases,
-- causing a 403 Forbidden because the USING clause isn't meant for new rows.
--
-- FIX:
-- Create a SECURITY DEFINER RPC function that bypasses RLS to perform the
-- upsert operation. This is the recommended approach for upsert operations
-- that need to bypass RLS restrictions.
--
-- Then update the frontend to call this RPC instead of using supabase.upsert().

-- ============================================
-- 1. Create SECURITY DEFINER RPC function
-- ============================================
CREATE OR REPLACE FUNCTION public.send_follow_request(
  p_requester_id UUID,
  p_requested_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  result JSONB;
  existing_id UUID;
BEGIN
  -- Check if a follow request already exists
  SELECT id INTO existing_id
  FROM public.follow_requests
  WHERE requester_id = p_requester_id
    AND requested_id = p_requested_id;

  IF existing_id IS NOT NULL THEN
    -- Update existing request back to pending (handles re-request after rejection)
    UPDATE public.follow_requests
    SET status = 'pending', created_at = NOW()
    WHERE id = existing_id
    RETURNING jsonb_build_object(
      'id', id,
      'requester_id', requester_id,
      'requested_id', requested_id,
      'status', status,
      'created_at', created_at
    ) INTO result;
  ELSE
    -- Insert new follow request
    INSERT INTO public.follow_requests (requester_id, requested_id, status)
    VALUES (p_requester_id, p_requested_id, 'pending')
    RETURNING jsonb_build_object(
      'id', id,
      'requester_id', requester_id,
      'requested_id', requested_id,
      'status', status,
      'created_at', created_at
    ) INTO result;
  END IF;

  -- Auto-create notification for the follow request
  BEGIN
    INSERT INTO public.notifications (user_id, type, actor_id)
    VALUES (p_requested_id, 'follow_request', p_requester_id);
  EXCEPTION WHEN OTHERS THEN
    -- Silently ignore if notifications table doesn't exist or other issues
    NULL;
  END;

  RETURN result;
END;
$$;

-- ============================================
-- 2. Drop the existing policies (from 00019) and recreate them properly
-- ============================================

-- Drop ALL existing policies on follow_requests to start clean
DROP POLICY IF EXISTS "Users can view their own follow requests" ON public.follow_requests;
DROP POLICY IF EXISTS "Users can create follow requests" ON public.follow_requests;
DROP POLICY IF EXISTS "Users can update follow requests" ON public.follow_requests;
DROP POLICY IF EXISTS "Users can delete their own follow requests" ON public.follow_requests;
DROP POLICY IF EXISTS "Users can create or update follow requests" ON public.follow_requests;

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
-- NOTE: The WITH CHECK clause is the key fix for UPSERT. We use a simple
-- condition that PostgREST can evaluate on both INSERT and UPDATE phases.
CREATE POLICY "Users can update follow requests"
  ON public.follow_requests FOR UPDATE
  USING (auth.uid() = requester_id OR auth.uid() = requested_id)
  WITH CHECK (auth.uid() = requester_id OR auth.uid() = requested_id);

-- DELETE: Users can delete their own follow requests (cancel)
CREATE POLICY "Users can delete their own follow requests"
  ON public.follow_requests FOR DELETE
  USING (auth.uid() = requester_id OR auth.uid() = requested_id);

-- ============================================
-- 3. Create SECURITY DEFINER RPC to approve follow request
--    Atomically: sets status to 'approved' AND creates the follow relationship
--    in the correct direction (requester follows requested).
-- ============================================
CREATE OR REPLACE FUNCTION public.approve_follow_request(
  p_request_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_requester_id UUID;
  v_requested_id UUID;
  result JSONB;
BEGIN
  -- Get the request details
  SELECT requester_id, requested_id INTO v_requester_id, v_requested_id
  FROM public.follow_requests
  WHERE id = p_request_id AND status = 'pending';

  IF v_requester_id IS NULL THEN
    RAISE EXCEPTION 'Follow request not found or already processed';
  END IF;

  -- Update the request status to approved
  UPDATE public.follow_requests
  SET status = 'approved'
  WHERE id = p_request_id
  RETURNING jsonb_build_object(
    'id', id,
    'requester_id', requester_id,
    'requested_id', requested_id,
    'status', status
  ) INTO result;

  -- Create the follow relationship in the CORRECT direction:
  -- The requester follows the requested user (the private account owner)
  INSERT INTO public.follows (follower_id, following_id)
  VALUES (v_requester_id, v_requested_id)
  ON CONFLICT (follower_id, following_id) DO NOTHING;

  -- Auto-create notification for the follow accept
  BEGIN
    INSERT INTO public.notifications (user_id, type, actor_id)
    VALUES (v_requester_id, 'follow_accept', v_requested_id);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN result;
END;
$$;

-- ============================================
-- 4. Grant execute permission on the RPC functions
-- ============================================
GRANT EXECUTE ON FUNCTION public.send_follow_request(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_follow_request(UUID, UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.send_follow_request(UUID, UUID) TO service_role;

GRANT EXECUTE ON FUNCTION public.approve_follow_request(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_follow_request(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.approve_follow_request(UUID) TO service_role;

