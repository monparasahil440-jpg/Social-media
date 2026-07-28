-- ============================================
-- Fix: Ambiguous column reference in hide_conversation/unhide_conversation RPC functions
-- Issue: The parameter name "conversation_id" collided with the table column "conversation_id",
-- causing PostgreSQL error 42702: "column reference 'conversation_id' is ambiguous"
-- ============================================

-- Recreate hide_conversation with disambiguated parameter name
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
  AND hidden_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate unhide_conversation with disambiguated parameter name
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
  AND hidden_at IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.hide_conversation(UUID) IS 'Hide a conversation for the current user (parameter: p_conversation_id)';
COMMENT ON FUNCTION public.unhide_conversation(UUID) IS 'Unhide a conversation for the current user (parameter: p_conversation_id)';

