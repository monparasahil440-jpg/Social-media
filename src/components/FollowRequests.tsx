import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  getPendingFollowRequestsForMe,
  approveFollowRequest,
  rejectFollowRequest,
  followUser,
} from '../lib/supabaseClient'
import Avatar from './Avatar'
import LoadingSpinner from './LoadingSpinner'
import type { FollowRequest } from '../types'

interface FollowRequestsProps {
  onClose: () => void
}

const FollowRequests = ({ onClose }: FollowRequestsProps) => {
  const [requests, setRequests] = useState<FollowRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({})

  useEffect(() => {
    loadRequests()
  }, [])

  const loadRequests = async () => {
    setIsLoading(true)
    try {
      const data = await getPendingFollowRequestsForMe()
      setRequests(data)
    } catch (err) {
      console.error('Error loading follow requests:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleApprove = async (requestId: string, requesterId: string) => {
    setActionLoading((prev) => ({ ...prev, [requestId]: true }))
    try {
      await approveFollowRequest(requestId)
      // Follow the user back (create the follow relationship)
      await followUser(requesterId)
      // Remove from list
      setRequests((prev) => prev.filter((r) => r.id !== requestId))
    } catch (err) {
      console.error('Error approving request:', err)
    } finally {
      setActionLoading((prev) => ({ ...prev, [requestId]: false }))
    }
  }

  const handleReject = async (requestId: string) => {
    setActionLoading((prev) => ({ ...prev, [requestId]: true }))
    try {
      await rejectFollowRequest(requestId)
      // Remove from list
      setRequests((prev) => prev.filter((r) => r.id !== requestId))
    } catch (err) {
      console.error('Error rejecting request:', err)
    } finally {
      setActionLoading((prev) => ({ ...prev, [requestId]: false }))
    }
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHour = Math.floor(diffMin / 60)
    const diffDay = Math.floor(diffHour / 24)
    if (diffSec < 60) return 'Just now'
    if (diffMin < 60) return `${diffMin}m ago`
    if (diffHour < 24) return `${diffHour}h ago`
    if (diffDay < 7) return `${diffDay}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Follow Requests</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto py-2">
          {isLoading ? (
            <div className="py-8">
              <LoadingSpinner size="md" message="Loading requests..." />
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">📋</div>
              <p className="text-gray-500 text-sm">No pending follow requests</p>
            </div>
          ) : (
            requests.map((request) => (
              <div key={request.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                <Link
                  to={`/profile/${request.requester_id}`}
                  onClick={onClose}
                  className="flex items-center gap-3 flex-1 min-w-0"
                >
                  <Avatar
                    src={request.requester?.avatar_url}
                    name={request.requester?.full_name || request.requester?.username}
                    size="w-10 h-10"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 text-sm truncate">
                      {request.requester?.full_name || request.requester?.username}
                    </p>
                    <p className="text-xs text-gray-500 truncate">@{request.requester?.username}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatTime(request.created_at)}</p>
                  </div>
                </Link>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleApprove(request.id, request.requester_id)}
                    disabled={actionLoading[request.id]}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50"
                  >
                    {actionLoading[request.id] ? (
                      <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      'Confirm'
                    )}
                  </button>
                  <button
                    onClick={() => handleReject(request.id)}
                    disabled={actionLoading[request.id]}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50"
                  >
                    {actionLoading[request.id] ? (
                      <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      'Delete'
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default FollowRequests
