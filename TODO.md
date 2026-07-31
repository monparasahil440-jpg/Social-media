# TODO: Add Comment Reactions Feature

## Status: ✅ Complete

### Steps:
- [x] Analyze codebase and plan implementation
- [x] Get plan approval
- [x] **Step 1**: Create migration `00021_comment_reactions.sql`
- [x] **Step 2**: Update `src/types/index.ts` with CommentReaction types
- [x] **Step 3**: Update `src/lib/supabaseClient.ts` with reaction functions
- [x] **Step 4**: Update `src/components/CommentSection.tsx` with reaction UI

## Summary of Changes

### 1. New Migration: `supabase/migrations/00021_comment_reactions.sql`
- Creates `comment_reaction_type` enum (`like`, `love`, `laugh`, `wow`, `sad`, `angry`)
- Creates `comment_reactions` table with `UNIQUE(comment_id, user_id)` constraint
- RLS policies for SELECT (everyone), INSERT/UPDATE/DELETE (own reactions)
- Trigger for auto-creating notifications when someone reacts to your comment
- Extends the notifications check constraint to include `comment_reaction`

### 2. Updated Types: `src/types/index.ts`
- Added `CommentReactionType` type
- Added `CommentReaction` interface
- Extended `Comment` interface with `reactions` and `user_reaction` fields
- Added `'comment_reaction'` to Notification type

### 3. Updated Client: `src/lib/supabaseClient.ts`
- Added `reactToComment()` - upsert a reaction
- Added `removeCommentReaction()` - remove reaction
- Added `getCommentReactions()` - get counts + user's reaction for one comment
- Added `getBatchCommentReactions()` - batch query for efficiency

### 4. Updated UI: `src/components/CommentSection.tsx`
- Emoji picker popup on "React" button click
- Visual feedback for active reaction (highlighted, scaled)
- Click same reaction to remove it, click different to switch
- Inline reaction summary for non-logged-in users
- Optimistic UI updates for instant feedback
- Click-outside-to-close behavior for picker

