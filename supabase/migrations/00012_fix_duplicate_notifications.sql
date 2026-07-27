-- ============================================
-- Fix: Prevent duplicate notification entries
-- ============================================

-- 1. Clean up existing duplicate notifications
-- Keep only the most recent row for each unique (user_id, type, actor_id, post_id) combination
DELETE FROM public.notifications n1
USING (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, type, actor_id, COALESCE(post_id, '00000000-0000-0000-0000-000000000000')
      ORDER BY created_at DESC
    ) AS rn
  FROM public.notifications
) n2
WHERE n1.id = n2.id AND n2.rn > 1;

-- 2. Create a partial unique index to prevent future duplicates
-- Using COALESCE to treat NULL post_id as a distinct sentinel value
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_unique_per_event
ON public.notifications (user_id, type, actor_id, COALESCE(post_id, '00000000-0000-0000-0000-000000000000'));

-- 3. Modify the handle_like_notification function to use ON CONFLICT DO NOTHING
CREATE OR REPLACE FUNCTION public.handle_like_notification()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, actor_id, post_id)
  SELECT p.user_id, 'like', NEW.user_id, NEW.post_id
  FROM public.posts p
  WHERE p.id = NEW.post_id AND p.user_id != NEW.user_id
  ON CONFLICT (user_id, type, actor_id, COALESCE(post_id, '00000000-0000-0000-0000-000000000000'))
  DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Modify the handle_comment_notification function to use ON CONFLICT DO NOTHING
CREATE OR REPLACE FUNCTION public.handle_comment_notification()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, actor_id, post_id, comment_id)
  SELECT p.user_id, 'comment', NEW.user_id, NEW.post_id, NEW.id
  FROM public.posts p
  WHERE p.id = NEW.post_id AND p.user_id != NEW.user_id
  ON CONFLICT (user_id, type, actor_id, COALESCE(post_id, '00000000-0000-0000-0000-000000000000'))
  DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Modify the handle_follow_notification function to use ON CONFLICT DO NOTHING
CREATE OR REPLACE FUNCTION public.handle_follow_notification()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, actor_id)
  VALUES (NEW.following_id, 'follow', NEW.follower_id)
  ON CONFLICT (user_id, type, actor_id, COALESCE(post_id, '00000000-0000-0000-0000-000000000000'))
  DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

