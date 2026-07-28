# Completed

## 1. ✅ Fixed Infinite Recursion in `hideConversation` / `unhideConversation`
**File:** `src/hooks/useChat.ts`

Imported functions from `supabaseClient` are now aliased as `hideConversationApi` / `unhideConversationApi`
to prevent shadowing recursion. The local wrapper functions now call the API functions instead of themselves.

## 2. ✅ Fixed Ambiguous Column Reference in PostgreSQL RPC Functions
**Files:** 
- `src/lib/supabaseClient.ts` - RPC call param changed to `{ p_conversation_id }`
- `supabase/migrations/00014_add_conversation_hiding.sql` - Parameter names changed to `p_conversation_id`
- `supabase/migrations/00015_fix_hide_conversation_ambiguous_column.sql` - New fixup migration (run this!)

## 3. ✅ Added Confirmation Popup Before Hide/Unhide
**File:** `src/components/Chat/ChatList.tsx`

When user clicks the cross/eye icon, a confirmation dialog now appears:
- **Hide:** Shows red-themed dialog asking "Hide conversation?" with user's name
- **Unhide:** Shows green-themed dialog asking "Unhide conversation?" with user's name
- Cancel button dismisses without action
- Confirm button performs the actual hide/unhide operation
- Dialog closes automatically after action completes

