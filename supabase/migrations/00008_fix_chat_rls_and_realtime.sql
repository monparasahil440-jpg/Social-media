-- ============================================
-- Fix: Chat RLS Policies & Realtime Configuration
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. DROP EXISTING POLICIES (clean slate)
-- ============================================

DROP POLICY IF EXISTS "Participants can view conversations" ON public.conversations;
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Participants can update conversations" ON public.conversations;

DROP POLICY IF EXISTS "Users can view their participations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can insert participations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can update their own last_read" ON public.conversation_participants;

DROP POLICY IF EXISTS "Participants can view messages" ON public.messages;
DROP POLICY IF EXISTS "Participants can insert messages" ON public.messages;
DROP POLICY IF EXISTS "Participants can delete their own messages" ON public.messages;

-- ============================================
-- 2. CONVERSATIONS POLICIES
-- ============================================

-- SELECT: Participants can view conversations they belong to
CREATE POLICY "Participants can view conversations"
  ON public.conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_id = conversations.id
      AND user_id = auth.uid()
    )
  );

-- INSERT: Any authenticated user can create a conversation
CREATE POLICY "Authenticated users can create conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- UPDATE: Participants can update conversation metadata
CREATE POLICY "Participants can update conversations"
  ON public.conversations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_id = conversations.id
      AND user_id = auth.uid()
    )
  );

-- ============================================
-- 3. CONVERSATION PARTICIPANTS POLICIES
-- ============================================

-- SELECT: Users can view their own participations
CREATE POLICY "Users can view their participations"
  ON public.conversation_participants FOR SELECT
  USING (user_id = auth.uid());

-- INSERT: Users can insert themselves OR
-- add another user IF they are already a participant
CREATE POLICY "Users can insert participations"
  ON public.conversation_participants FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.user_id = auth.uid()
    )
  );

-- UPDATE: Users can update their own last_read_at
CREATE POLICY "Users can update their own last_read"
  ON public.conversation_participants FOR UPDATE
  USING (user_id = auth.uid());

-- ============================================
-- 4. MESSAGES POLICIES
-- ============================================

-- SELECT: Participants can view messages in their conversations
CREATE POLICY "Participants can view messages"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_id = messages.conversation_id
      AND user_id = auth.uid()
    )
  );

-- INSERT: Participants can insert messages (must be sender and participant)
CREATE POLICY "Participants can insert messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_id = messages.conversation_id
      AND user_id = auth.uid()
    )
  );

-- DELETE: Senders can delete their own messages
CREATE POLICY "Participants can delete their own messages"
  ON public.messages FOR DELETE
  USING (sender_id = auth.uid());

-- ============================================
-- 5. CALL SIGNALS POLICIES (re-apply if missing)
-- ============================================

DROP POLICY IF EXISTS "Users can view their own call signals" ON public.call_signals;
DROP POLICY IF EXISTS "Users can insert call signals" ON public.call_signals;
DROP POLICY IF EXISTS "Users can delete their own call signals" ON public.call_signals;

CREATE POLICY "Users can view their own call signals"
  ON public.call_signals FOR SELECT
  USING (receiver_id = auth.uid() OR sender_id = auth.uid());

CREATE POLICY "Users can insert call signals"
  ON public.call_signals FOR INSERT
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can delete their own call signals"
  ON public.call_signals FOR DELETE
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

-- ============================================
-- 6. ENABLE REPLICATION (Realtime)
-- ============================================

-- Enable realtime for chat-related tables
-- Note: Requires the `supabase_realtime` publication to exist
-- Run these commands to add tables to the realtime publication

-- First, ensure the publication exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

-- Add tables to realtime publication (skip if already member)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'conversation_participants'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_participants;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'call_signals'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.call_signals;
  END IF;
END $$;

-- ============================================
-- 7. VERIFICATION QUERIES
-- ============================================

-- Run these to verify everything is set up correctly:

-- Check all policies for conversations table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename IN ('conversations', 'conversation_participants', 'messages', 'call_signals')
ORDER BY tablename, policyname;

-- Check which tables are in the realtime publication
SELECT schemaname, tablename, pubname
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
AND schemaname = 'public'
ORDER BY tablename;

