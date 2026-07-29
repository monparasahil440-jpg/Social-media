# Call System Bug Fixes

## Issues Fixed
- [x] Plan approved

## Fix 1: WebRTC Race Condition on Answer Call
- [ ] Add `pendingOfferRef` in CallProvider.tsx to store incoming offer SDP
- [ ] Store offer in ref inside signal subscription handler
- [ ] Add `setRemoteOffer()` method to WebRTCManager.ts
- [ ] Fix `answerCall()` in CallProvider.tsx to restore offer after initialize() clears it

## Fix 2: Realtime Notification Channel CLOSED
- [ ] Fix NotificationBell.tsx channel subscription to handle StrictMode double-mounting

## Fix 3: `call_sessions` table migration
- [ ] User action: Run 00013_call_sessions.sql in Supabase SQL editor

## Fix 4: Status state timing in answerCall
- [ ] Move `setCallState({status:'connected'})` after WebRTC operations complete

