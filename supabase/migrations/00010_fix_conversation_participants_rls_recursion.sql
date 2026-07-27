-- ============================================
-- Fix: conversation_participants RLS infinite recursion
-- 
-- PROBLEM: The previous policy (migration 00009) queryed
--   conversation_participants inside the policy for the same table,
--   causing infinite recursion (error 42P17).
--
-- FIX: Use a SECURITY DEFINER function that bypasses RLS
--   to check if a user is a participant in a conversation.
-- ============================================

-- Drop the recursive policy
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON public.conversation_participants;

-- Also drop the old restrictive policy if it still exists
DROP POLICY IF EXISTS "Users can view their participations" ON public.conversation_participants;

-- ============================================
-- Create a SECURITY DEFINER helper function
-- This function runs with the privileges of the owner (bypasses RLS)
-- so it can safely check conversation_participants without recursion.
-- ============================================
CREATE OR REPLACE FUNCTION public.is_conversation_participant(conv_id UUID, user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = conv_id
    AND user_id = $2
  );
$$;

-- ============================================
-- New policy using the SECURITY DEFINER function
-- This avoids recursion because the function runs outside RLS.
-- ============================================
CREATE POLICY "Users can view participants in their conversations"
  ON public.conversation_participants FOR SELECT
  USING (
    public.is_conversation_participant(conversation_id, auth.uid())
  );

-- ============================================
-- Also fix the "Users can insert participations" policy
-- It had the same recursion risk:
-- ============================================
DROP POLICY IF EXISTS "Users can insert participations" ON public.conversation_participants;

CREATE POLICY "Users can insert participations"
  ON public.conversation_participants FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    OR public.is_conversation_participant(conversation_id, auth.uid())
  );

-- ============================================
-- Verification: Run this query to check policies
-- ============================================
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'conversation_participants'
-- ORDER BY policyname;
