/**
 * CallService - Supabase operations for call sessions, ratings, and signaling.
 */
import { supabase } from '../lib/supabaseClient'
import type { CallSession, CallRating, CallSessionStatus } from '../types'

// ============== CALL SESSION OPERATIONS ==============

/**
 * Create a new call session record
 */
export const createCallSession = async (
  conversationId: string,
  callerId: string,
  receiverId: string,
  callType: 'audio' | 'video'
): Promise<CallSession> => {
  const { data, error } = await supabase
    .from('call_sessions')
    .insert({
      conversation_id: conversationId,
      caller_id: callerId,
      receiver_id: receiverId,
      call_type: callType,
      status: 'missed',
    })
    .select('*')
    .single()

  if (error) throw error
  return data as CallSession
}

/**
 * Update call session status and duration
 */
export const updateCallSession = async (
  sessionId: string,
  updates: {
    status?: CallSessionStatus
    ended_at?: string
    duration?: number
  }
): Promise<void> => {
  const { error } = await supabase
    .from('call_sessions')
    .update(updates)
    .eq('id', sessionId)

  if (error) throw error
}

/**
 * Get call history for a user
 */
export const getCallHistory = async (
  userId: string,
  limit = 20
): Promise<CallSession[]> => {
  const { data, error } = await supabase
    .from('call_sessions')
    .select(`
      *,
      caller:profiles!call_sessions_caller_id_fkey(id, username, full_name, avatar_url),
      receiver:profiles!call_sessions_receiver_id_fkey(id, username, full_name, avatar_url)
    `)
    .or(`caller_id.eq.${userId},receiver_id.eq.${userId}`)
    .order('started_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data || []) as CallSession[]
}

// ============== CALL RATING OPERATIONS ==============

/**
 * Submit a rating for a completed call
 */
export const submitCallRating = async (
  callSessionId: string,
  userId: string,
  rating: number,
  feedback?: string
): Promise<CallRating> => {
  const { data, error } = await supabase
    .from('call_ratings')
    .insert({
      call_session_id: callSessionId,
      user_id: userId,
      rating,
      feedback: feedback || null,
    })
    .select('*')
    .single()

  if (error) throw error
  return data as CallRating
}

/**
 * Get rating for a specific call session by the current user
 */
export const getCallRating = async (
  callSessionId: string,
  userId: string
): Promise<CallRating | null> => {
  const { data, error } = await supabase
    .from('call_ratings')
    .select('*')
    .eq('call_session_id', callSessionId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  return data as CallRating | null
}

// ============== SIGNALING HELPERS ==============

/**
 * Send a WebRTC signal
 */
export const sendSignal = async (
  conversationId: string,
  senderId: string,
  receiverId: string,
  signalData: any,
  signalType: string
): Promise<void> => {
  const { error } = await supabase
    .from('call_signals')
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      receiver_id: receiverId,
      signal_data: signalData,
      signal_type: signalType,
    })

  if (error) throw error
}

/**
 * Subscribe to incoming signals for a user
 */
export const subscribeToSignals = (
  userId: string,
  callback: (payload: any) => void
) => {
  const channelName = `calls-${userId}-${Date.now()}`
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'call_signals',
        filter: `receiver_id=eq.${userId}`,
      },
      async (payload: any) => {
        callback(payload.new)
      }
    )
    .subscribe()

  return channel
}

/**
 * Delete signals for a conversation (cleanup)
 */
export const deleteSignalsForConversation = async (
  conversationId: string
): Promise<void> => {
  const { error } = await supabase
    .from('call_signals')
    .delete()
    .eq('conversation_id', conversationId)

  if (error) throw error
}

