-- ============================================
-- Chat & Voice/Video Call Schema
-- Instagram-style direct messaging + calling
-- ============================================

-- 1. Conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- 2. Conversation Participants
CREATE TABLE IF NOT EXISTS public.conversation_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

-- 3. Messages
CREATE TYPE message_type AS ENUM ('text', 'image', 'call');

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT DEFAULT '',
  image_url TEXT,
  message_type message_type DEFAULT 'text',
  call_type TEXT CHECK (call_type IN ('audio', 'video')),
  call_duration INTEGER, -- in seconds
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 4. Call Signals (WebRTC signaling via DB)
CREATE TABLE IF NOT EXISTS public.call_signals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  signal_data JSONB NOT NULL,
  signal_type TEXT NOT NULL CHECK (signal_type IN ('offer', 'answer', 'ice-candidate')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.call_signals ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user ON public.conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation ON public.conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at ASC);
CREATE INDEX IF NOT EXISTS idx_call_signals_receiver ON public.call_signals(receiver_id);
CREATE INDEX IF NOT EXISTS idx_call_signals_conversation ON public.call_signals(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON public.conversations(last_message_at DESC);

-- ============================================
-- RLS Policies
-- ============================================

-- Conversations: participants can view
CREATE POLICY "Participants can view conversations"
  ON public.conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_id = conversations.id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Participants can update conversations"
  ON public.conversations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_id = conversations.id
      AND user_id = auth.uid()
    )
  );

-- Conversation Participants: users can view their own participations
CREATE POLICY "Users can view their participations"
  ON public.conversation_participants FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert participations"
  ON public.conversation_participants FOR INSERT
  WITH CHECK (
    -- Allow insert if user is part of the conversation
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_id = conversation_participants.conversation_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own last_read"
  ON public.conversation_participants FOR UPDATE
  USING (user_id = auth.uid());

-- Messages: participants can view
CREATE POLICY "Participants can view messages"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_id = messages.conversation_id
      AND user_id = auth.uid()
    )
  );

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

CREATE POLICY "Participants can delete their own messages"
  ON public.messages FOR DELETE
  USING (sender_id = auth.uid());

-- Call Signals
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
-- Function: Auto-update conversation last_message_at
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations
  SET last_message_at = NOW(), updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_message_created ON public.messages;
CREATE TRIGGER on_message_created
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_message();

-- ============================================
-- Function: Auto-create notification on new message
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_message_notification()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, actor_id, post_id)
  SELECT cp.user_id, 'comment', NEW.sender_id, NULL
  FROM public.conversation_participants cp
  WHERE cp.conversation_id = NEW.conversation_id
  AND cp.user_id != NEW.sender_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_message_notification ON public.messages;
CREATE TRIGGER on_message_notification
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.handle_message_notification();


