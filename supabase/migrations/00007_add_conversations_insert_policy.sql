-- ============================================
-- Fix: Add missing INSERT policy for conversations table
-- Run this standalone in Supabase SQL Editor
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'conversations'
    AND policyname = 'Authenticated users can create conversations'
  ) THEN
    EXECUTE format('
      CREATE POLICY "Authenticated users can create conversations"
        ON public.conversations FOR INSERT
        WITH CHECK (auth.role() = ''authenticated'')
    ');
  END IF;
END $$;
