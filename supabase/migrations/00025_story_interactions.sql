-- ============================================
-- Story Likes & Emoji Reactions Migration
-- ============================================

CREATE TABLE IF NOT EXISTS public.story_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID REFERENCES public.stories(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  reaction TEXT DEFAULT '❤️',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(story_id, user_id)
);

ALTER TABLE public.story_likes ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.story_likes ADD COLUMN IF NOT EXISTS reaction TEXT DEFAULT '❤️';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_story_likes_story_id ON public.story_likes(story_id);
CREATE INDEX IF NOT EXISTS idx_story_likes_user_id ON public.story_likes(user_id);

-- Drop existing policies first
DROP POLICY IF EXISTS "Authenticated users can like stories" ON public.story_likes;
DROP POLICY IF EXISTS "Users can remove their story likes" ON public.story_likes;
DROP POLICY IF EXISTS "Story owners & likers can view story likes" ON public.story_likes;

-- RLS Policies
CREATE POLICY "Authenticated users can like stories"
  ON public.story_likes FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can remove their story likes"
  ON public.story_likes FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Story owners & likers can view story likes"
  ON public.story_likes FOR SELECT USING (true);
