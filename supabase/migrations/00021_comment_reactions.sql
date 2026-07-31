-- ============================================
-- Comment Reactions Migration
-- ============================================
-- Adds support for multiple reaction types on comments.
-- Reactions: like, love, laugh, wow, sad, angry
-- One reaction per user per comment (upsert behavior).

-- ============================================
-- 1. Create reaction enum type
-- ============================================
DO $$ BEGIN
  CREATE TYPE public.comment_reaction_type AS ENUM (
    'like',
    'love',
    'laugh',
    'wow',
    'sad',
    'angry'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 2. Create comment_reactions table
-- ============================================
CREATE TABLE IF NOT EXISTS public.comment_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  reaction public.comment_reaction_type NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);

ALTER TABLE public.comment_reactions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_comment_reactions_comment_id ON public.comment_reactions(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_reactions_user_id ON public.comment_reactions(user_id);

-- ============================================
-- 4. RLS Policies
-- ============================================

-- SELECT: Everyone can see reactions (for counting)
CREATE POLICY "Comment reactions are viewable by everyone"
  ON public.comment_reactions FOR SELECT
  USING (true);

-- INSERT: Authenticated users can react (must be self)
CREATE POLICY "Users can add reactions"
  ON public.comment_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can change their own reaction (e.g., like -> love)
CREATE POLICY "Users can update their own reactions"
  ON public.comment_reactions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can remove their own reactions
CREATE POLICY "Users can delete their own reactions"
  ON public.comment_reactions FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 5. Function: Auto-create notification on comment reaction
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_comment_reaction_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_post_id UUID;
  v_comment_author_id UUID;
BEGIN
  -- Get the comment's post_id and the comment author's user_id
  SELECT c.post_id, c.user_id INTO v_post_id, v_comment_author_id
  FROM public.comments c
  WHERE c.id = NEW.comment_id;

  -- Only notify if someone else reacts to your comment (not yourself)
  IF v_comment_author_id != NEW.user_id THEN
    INSERT INTO public.notifications (user_id, type, actor_id, post_id, comment_id)
    VALUES (v_comment_author_id, 'comment_reaction', NEW.user_id, v_post_id, NEW.comment_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_comment_reaction_created ON public.comment_reactions;
CREATE TRIGGER on_comment_reaction_created
  AFTER INSERT ON public.comment_reactions
  FOR EACH ROW EXECUTE FUNCTION public.handle_comment_reaction_notification();

-- ============================================
-- 6. Update notifications check constraint to include comment_reaction
--    This needs the existing constraint to be dropped and recreated
-- ============================================
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('follow', 'like', 'comment', 'follow_request', 'follow_accept', 'mention', 'comment_reaction'));

