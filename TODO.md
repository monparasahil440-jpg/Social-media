# Chat System Audit - Fixes Applied

## Bug 1: "Unknown User" in conversations (Profile data not attached)
- **Root Cause**: `conversation_participants` RLS policy blocked reading other participant's row
- **Fix**: Added `getOtherParticipantInConversation()` helper with 3-tier fallback
- **Status**: ✅ Fixed in `src/lib/supabaseClient.ts`

## Bug 2: Calls not being received (incoming offer destroyed)
- **Root Cause 1**: Cleanup function in `useCall.ts` signal subscription called `deleteCallSignals()`, destroying incoming offers before user could answer
- **Root Cause 2**: Incoming offer was never stored; `answerCall()` tried to call `createAnswer()` without setting remote description first
- **Fix**: 
  1. Removed `deleteCallSignals()` from subscription cleanup
  2. Added `pendingOfferRef` to store incoming offer
  3. `answerCall()` now applies the pending offer before creating answer
  4. Changed `useEffect` deps to not include `callState.conversationId` (prevent subscription teardown)
- **Status**: ✅ Fixed in `src/hooks/useCall.ts`

## Bug 3: Missing onAnswerCall/onRejectCall props in ChatWindow
- **Root Cause**: `ChatWindow.tsx` wasn't passing `answerCall` and `rejectCall` to `CallUI`
- **Fix**: Added `onAnswerCall={answerCall}` and `onRejectCall={rejectCall}` to `CallUI` props
- **Status**: ✅ Fixed in `src/components/Chat/ChatWindow.tsx`

