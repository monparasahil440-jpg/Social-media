-- ============================================
-- Add comment replies support
-- ============================================

-- Add parent_comment_id to allow replies
ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS parent_comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE;

-- Index for fast reply lookup
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON public.comments(parent_comment_id);
