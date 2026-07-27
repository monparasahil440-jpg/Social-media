-- ============================================
-- Fix: conversation_participants RLS policy
-- The old policy ONLY allowed users to see their OWN row:
--   USING (user_id = auth.uid())
-- This prevented finding the OTHER participant's user_id,
-- making it impossible to look up their profile.
--
-- New policy: Allow participants to see ALL participants
-- in conversations they belong to.
-- ============================================

-- Drop the overly restrictive policy
DROP POLICY IF EXISTS "Users can view their participations" ON public.conversation_participants;

-- New policy: participants can see all participants in their conversations
CREATE POLICY "Users can view participants in their conversations"
  ON public.conversation_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.user_id = auth.uid()
    )
  );

