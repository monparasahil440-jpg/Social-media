-- ============================================
-- Call Sessions & Ratings Tables
-- Instagram-style call history + rating system
-- ============================================

-- 1. Call Sessions (tracks every call attempt)
CREATE TABLE IF NOT EXISTS public.call_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  caller_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  call_type TEXT NOT NULL CHECK (call_type IN ('audio', 'video')),
  status TEXT NOT NULL CHECK (status IN ('missed', 'answered', 'rejected', 'cancelled', 'failed')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration INTEGER DEFAULT 0, -- in seconds
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.call_sessions ENABLE ROW LEVEL SECURITY;

-- 2. Call Ratings (optional feedback after call ends)
CREATE TABLE IF NOT EXISTS public.call_ratings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  call_session_id UUID REFERENCES public.call_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(call_session_id, user_id)
);

ALTER TABLE public.call_ratings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_call_sessions_caller ON public.call_sessions(caller_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_receiver ON public.call_sessions(receiver_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_conversation ON public.call_sessions(conversation_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_started ON public.call_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_ratings_session ON public.call_ratings(call_session_id);

-- ============================================
-- RLS Policies - Call Sessions
-- ============================================
CREATE POLICY "Participants can view call sessions"
  ON public.call_sessions FOR SELECT
  USING (
    caller_id = auth.uid() OR receiver_id = auth.uid()
  );

CREATE POLICY "Participants can create call sessions"
  ON public.call_sessions FOR INSERT
  WITH CHECK (
    auth.uid() = caller_id OR auth.uid() = receiver_id
  );

CREATE POLICY "Participants can update call sessions"
  ON public.call_sessions FOR UPDATE
  USING (
    caller_id = auth.uid() OR receiver_id = auth.uid()
  );

-- ============================================
-- RLS Policies - Call Ratings
-- ============================================
CREATE POLICY "Users can view their own ratings"
  ON public.call_ratings FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can view ratings for their calls"
  ON public.call_ratings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.call_sessions
      WHERE call_sessions.id = call_ratings.call_session_id
      AND (call_sessions.caller_id = auth.uid() OR call_sessions.receiver_id = auth.uid())
    )
  );

CREATE POLICY "Users can create their own ratings"
  ON public.call_ratings FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own ratings"
  ON public.call_ratings FOR UPDATE
  USING (user_id = auth.uid());

-- ============================================
-- Realtime: Enable replication for call_sessions
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_sessions;


