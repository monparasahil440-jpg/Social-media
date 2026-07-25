# Fix Plan - Profile Image Upload & Notification Issues

## Steps

- [x] 1. Analyze all error sources
- [x] 2. Plan fixes (3 issues identified)
- [x] 3. Fix `subscribeToNotifications()` in `supabaseClient.ts` — use unique channel name per subscription
- [x] 4. Create `supabase/migrations/00005_storage_policies.sql` — create `images` storage bucket + RLS policies
- [x] 5. Fix avatar image display across all components (Navbar, PostCard, CommentSection, FollowListModal, Explore, CreatePost, PostDetail, NotificationBell, UserSearch)
- [x] 6. Added `refreshProfile()` call on profile save to update global auth state immediately


