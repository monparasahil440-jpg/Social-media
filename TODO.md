# Notification Duplicate Fix Plan

## Root Causes Identified
1. **No UNIQUE constraint** on notifications table → DB allows duplicate rows
2. **No deduplication in UI** → duplicates display as separate items
3. **No debouncing on real-time callbacks** → rapid events cause redundant DB queries
4. **React StrictMode** → double-mount effect can create duplicate subscriptions

## Steps

### Step 1: Database Migration - Prevent duplicates at DB level
- File: `supabase/migrations/00012_fix_duplicate_notifications.sql`
- Add a unique partial index on `(user_id, type, actor_id, post_id)` treating NULL post_id as a distinct value
- Modify trigger functions to use `ON CONFLICT DO NOTHING` for graceful duplicate handling
- Add a deduplication query to clean up existing duplicate notifications

### Step 2: Fix `subscribeToNotifications` in `supabaseClient.ts`
- Add module-level registry to prevent duplicate real-time channels
- Clean up stale channels before creating new ones

### Step 3: Fix `NotificationBell.tsx` - UI deduplication & debouncing
- Add deduplication using Map keyed on composite key
- Debounce real-time callbacks (300ms)
- Use refs to prevent stale subscription issues in StrictMode

