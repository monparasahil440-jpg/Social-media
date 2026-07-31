-- ============================================
-- Stories / Status Schema Migration
-- ============================================

CREATE TABLE IF NOT EXISTS public.stories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  media_url TEXT,
  caption TEXT,
  background_color TEXT DEFAULT 'from-indigo-600 to-purple-600',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours')
);

ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_stories_user_id ON public.stories(user_id);
CREATE INDEX IF NOT EXISTS idx_stories_expires_at ON public.stories(expires_at DESC);

-- Drop existing policies first to prevent collision errors
DROP POLICY IF EXISTS "Anyone authenticated can view active stories" ON public.stories;
DROP POLICY IF EXISTS "Users can create their own stories" ON public.stories;
DROP POLICY IF EXISTS "Users can delete their own stories" ON public.stories;

-- RLS Policies
CREATE POLICY "Anyone authenticated can view active stories"
  ON public.stories FOR SELECT USING (auth.role() = 'authenticated' AND expires_at > NOW());

CREATE POLICY "Users can create their own stories"
  ON public.stories FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stories"
  ON public.stories FOR DELETE USING (auth.uid() = user_id);

-- Safe storage bucket creation (wrapped to avoid deadlock conflicts with storage table locks)
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('stories', 'stories', true)
  ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  -- Storage bucket may already exist or be locked
  NULL;
END $$;
