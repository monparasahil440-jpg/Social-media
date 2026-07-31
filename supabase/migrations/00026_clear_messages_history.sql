-- ============================================
-- Clean / Clear All Messages History Migration
-- ============================================

-- 1. Delete all messages from messages table
DELETE FROM public.messages;

-- 2. Delete all WebRTC call signals
DELETE FROM public.call_signals;

-- 3. Delete all conversation participants
DELETE FROM public.conversation_participants;

-- 4. Delete all conversations
DELETE FROM public.conversations;
