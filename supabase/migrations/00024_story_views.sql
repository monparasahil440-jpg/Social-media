-- ============================================
-- Story Views / Viewers Migration
-- ============================================

CREATE TABLE IF NOT EXISTS public.story_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID REFERENCES public.stories(id) ON DELETE CASCADE NOT NULL,
  viewer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(story_id, viewer_id)
);

ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_story_views_story_id ON public.story_views(story_id);
CREATE INDEX IF NOT EXISTS idx_story_views_viewer_id ON public.story_views(viewer_id);

-- Drop existing policies first
DROP POLICY IF EXISTS "Authenticated users can insert story views" ON public.story_views;
DROP POLICY IF EXISTS "Story owners can view who watched their stories" ON public.story_views;

-- RLS Policies
CREATE POLICY "Authenticated users can insert story views"
  ON public.story_views FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Story owners can view who watched their stories"
  ON public.story_views FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.stories
      WHERE id = story_views.story_id AND user_id = auth.uid()
    ) OR viewer_id = auth.uid()
  );
