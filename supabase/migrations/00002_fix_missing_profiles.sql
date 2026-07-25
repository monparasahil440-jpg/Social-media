-- ============================================
-- Fix: Backfill missing profiles for existing auth users
-- ============================================
-- This migration ensures that all existing auth.users have a corresponding
-- entry in public.profiles, preventing FK constraint violations when
-- creating posts, comments, likes, or follows.

INSERT INTO public.profiles (id, username, full_name, avatar_url, bio, website, created_at, updated_at)
SELECT
  au.id,
  COALESCE(au.raw_user_meta_data->>'username', SPLIT_PART(au.email, '@', 1), CONCAT('user_', SUBSTRING(au.id::text, 1, 8))) AS username,
  COALESCE(au.raw_user_meta_data->>'full_name', SPLIT_PART(au.email, '@', 1), CONCAT('user_', SUBSTRING(au.id::text, 1, 8))) AS full_name,
  au.raw_user_meta_data->>'avatar_url' AS avatar_url,
  '' AS bio,
  '' AS website,
  NOW() AS created_at,
  NOW() AS updated_at
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL;

-- ============================================
-- Also update the trigger to be more robust:
-- Use ON CONFLICT to handle edge cases gracefully
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, avatar_url, bio, website)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    '',
    ''
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

