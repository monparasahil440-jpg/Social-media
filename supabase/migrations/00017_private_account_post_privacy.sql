-- ============================================
-- Private Account Post Privacy Migration
-- ============================================

-- Update RLS policy for posts to respect private account settings
-- This ensures that posts from private accounts are only visible to followers

DROP POLICY IF EXISTS "Posts are viewable by everyone" ON public.posts;

CREATE POLICY "Posts are viewable by everyone if public account"
  ON public.posts FOR SELECT
  USING (
    -- Allow if post owner's account is public
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = posts.user_id
      AND profiles.is_private = false
    )
    OR
    -- Allow if current user is the post owner
    auth.uid() = posts.user_id
    OR
    -- Allow if current user follows the post owner
    EXISTS (
      SELECT 1 FROM public.follows
      WHERE follows.follower_id = auth.uid()
      AND follows.following_id = posts.user_id
    )
  );
