-- ============================================
-- COMPREHENSIVE FIX: All Recursive RLS Policies
-- ============================================
--
-- ROOT CAUSE (migration 00009):
-- The SELECT policy on conversation_participants did:
--   USING (EXISTS (SELECT 1 FROM conversation_participants cp
--     WHERE cp.conversation_id = conversation_participants.conversation_id
--     AND cp.user_id = auth.uid()))
--
-- This is a self-referencing subquery on the SAME table.
-- Postgres evaluates RLS policies BEFORE the subquery runs,
-- so the subquery triggers the policy again → infinite recursion (42P17).
--
-- CASCADE EFFECT:
--   Every policy that subqueries conversation_participants also fails:
--   - conversations SELECT (checks participant membership)
--   - conversations UPDATE (checks participant membership)
--   - messages SELECT (checks participant membership)
--   - messages INSERT (checks participant membership)
--   - conversation_participants INSERT (checks participant membership)
--   - conversation_participants SELECT (self-referencing)
--
-- FIX:
--   Replace ALL direct subqueries against conversation_participants
--   with calls to a SECURITY DEFINER helper function.
--   SECURITY DEFINER runs with the table owner's privileges, bypassing RLS.
-- ============================================

-- ============================================
-- 1. Drop ALL existing policies on affected tables
-- ============================================
DROP POLICY IF EXISTS "Participants can view conversations" ON public.conversations;
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Participants can update conversations" ON public.conversations;

DROP POLICY IF EXISTS "Users can view their participations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can insert participations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can update their own last_read" ON public.conversation_participants;

DROP POLICY IF EXISTS "Participants can view messages" ON public.messages;
DROP POLICY IF EXISTS "Participants can insert messages" ON public.messages;
DROP POLICY IF EXISTS "Participants can delete their own messages" ON public.messages;

-- ============================================
-- 2. Create SECURITY DEFINER helper function
--    Bypasses RLS to check conversation membership safely.
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
-- 3. CONVERSATIONS POLICIES
--    All participant checks use the SECURITY DEFINER function.
-- ============================================

-- SELECT: Participants can view conversations they belong to
CREATE POLICY "Participants can view conversations"
  ON public.conversations FOR SELECT
  USING (
    public.is_conversation_participant(id, auth.uid())
  );

-- INSERT: Any authenticated user can create a conversation
CREATE POLICY "Authenticated users can create conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- UPDATE: Participants can update conversation metadata
CREATE POLICY "Participants can update conversations"
  ON public.conversations FOR UPDATE
  USING (
    public.is_conversation_participant(id, auth.uid())
  );

-- ============================================
-- 4. CONVERSATION PARTICIPANTS POLICIES
--    No self-referencing subqueries! Uses SECURITY DEFINER function.
-- ============================================

-- SELECT: Users can see all participants in conversations they belong to
CREATE POLICY "Users can view participants in their conversations"
  ON public.conversation_participants FOR SELECT
  USING (
    public.is_conversation_participant(conversation_id, auth.uid())
  );

-- INSERT: Users can insert themselves OR add another user if they're a participant
CREATE POLICY "Users can insert participations"
  ON public.conversation_participants FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    OR public.is_conversation_participant(conversation_id, auth.uid())
  );

-- UPDATE: Users can update their own last_read_at
CREATE POLICY "Users can update their own last_read"
  ON public.conversation_participants FOR UPDATE
  USING (user_id = auth.uid());

-- ============================================
-- 5. MESSAGES POLICIES
--    Participant checks use the SECURITY DEFINER function.
-- ============================================

-- SELECT: Participants can view messages in their conversations
CREATE POLICY "Participants can view messages"
  ON public.messages FOR SELECT
  USING (
    public.is_conversation_participant(conversation_id, auth.uid())
  );

-- INSERT: Participants can insert messages (must be sender and participant)
CREATE POLICY "Participants can insert messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND public.is_conversation_participant(conversation_id, auth.uid())
  );

-- DELETE: Senders can delete their own messages
CREATE POLICY "Participants can delete their own messages"
  ON public.messages FOR DELETE
  USING (sender_id = auth.uid());

-- ============================================
-- 6. CALL SIGNALS POLICIES (unchanged, no recursion)
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
-- 7. Enable realtime publication (safe to re-run)
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'conversation_participants'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_participants;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'call_signals'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.call_signals;
  END IF;
END $$;

-- ============================================
-- 8. VERIFICATION QUERY
-- ============================================
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename IN ('conversations', 'conversation_participants', 'messages', 'call_signals')
-- ORDER BY tablename, policyname;
