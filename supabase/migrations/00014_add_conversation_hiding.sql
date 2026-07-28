-- ============================================
-- Add conversation hiding/unhiding feature
-- Allows users to hide conversations from their list (like Instagram)
-- ============================================

-- 1. Add hidden_at column to conversation_participants table
ALTER TABLE public.conversation_participants
ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMPTZ;

-- 2. Add index for better performance on hidden conversations queries
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_hidden
ON public.conversation_participants(user_id, hidden_at)
WHERE hidden_at IS NOT NULL;

-- 3. Update RLS policies to respect the hidden_at flag
-- We need to modify the existing policies to exclude hidden conversations

-- First, let's update the "Participants can view conversations" policy
DROP POLICY IF EXISTS "Participants can view conversations" ON public.conversations;
CREATE POLICY "Participants can view conversations"
  ON public.conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_id = conversations.id
      AND user_id = auth.uid()
      AND hidden_at IS NULL  -- Only show non-hidden conversations
    )
  );

-- Update the "Participants can update conversations" policy
DROP POLICY IF EXISTS "Participants can update conversations" ON public.conversations;
CREATE POLICY "Participants can update conversations"
  ON public.conversations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_id = conversations.id
      AND user_id = auth.uid()
      AND hidden_at IS NULL  -- Only allow updating non-hidden conversations
    )
  );

-- Update the conversation_participants policies
-- Users can view their participations (including hidden ones for unhide functionality)
DROP POLICY IF EXISTS "Users can view their participations" ON public.conversation_participants;
CREATE POLICY "Users can view their participations"
  ON public.conversation_participants FOR SELECT
  USING (user_id = auth.uid());

-- Users can insert participations
DROP POLICY IF EXISTS "Users can insert participations" ON public.conversation_participants;
CREATE POLICY "Users can insert participations"
  ON public.conversation_participants FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_id = conversation_participants.conversation_id
      AND user_id = auth.uid()
    )
  );

-- Users can update their own participation (including hiding/unhiding)
DROP POLICY IF EXISTS "Users can update their own participation" ON public.conversation_participants;
CREATE POLICY "Users can update their own participation"
  ON public.conversation_participants FOR UPDATE
  USING (user_id = auth.uid());

-- 4. Create helper functions for hiding/unhiding conversations
-- Function to hide a conversation for a user
CREATE OR REPLACE FUNCTION public.hide_conversation(p_conversation_id UUID)
RETURNS VOID AS $$
DECLARE
  current_user_id UUID;
BEGIN
  SELECT auth.uid() INTO current_user_id;

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  UPDATE public.conversation_participants
  SET hidden_at = NOW()
  WHERE conversation_id = p_conversation_id
  AND user_id = current_user_id
  AND hidden_at IS NULL;  -- Only hide if not already hidden
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to unhide a conversation for a user
CREATE OR REPLACE FUNCTION public.unhide_conversation(p_conversation_id UUID)
RETURNS VOID AS $$
DECLARE
  current_user_id UUID;
BEGIN
  SELECT auth.uid() INTO current_user_id;

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  UPDATE public.conversation_participants
  SET hidden_at = NULL
  WHERE conversation_id = p_conversation_id
  AND user_id = current_user_id
  AND hidden_at IS NOT NULL;  -- Only unhide if currently hidden
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Add comments
COMMENT ON COLUMN public.conversation_participants.hidden_at IS 'Timestamp when the user hid this conversation. NULL means not hidden.';
COMMENT ON FUNCTION public.hide_conversation(UUID) IS 'Hide a conversation for the current user';
COMMENT ON FUNCTION public.unhide_conversation(UUID) IS 'Unhide a conversation for the current user';