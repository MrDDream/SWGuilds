'use client'

import { useState, useEffect, useCallback } from 'react'

interface VoteButtonsProps {
  entityId: string
  entityType: 'defense' | 'counter'
  initialLikes?: number
  initialDislikes?: number
  initialUserVote?: 'like' | 'dislike' | null
}

export function VoteButtons({ 
  entityId, 
  entityType, 
  initialLikes = 0, 
  initialDislikes = 0,
  initialUserVote = null 
}: VoteButtonsProps) {
  const [likes, setLikes] = useState(initialLikes)
  const [dislikes, setDislikes] = useState(initialDislikes)
  const [userVote, setUserVote] = useState<'like' | 'dislike' | null>(initialUserVote)
  const [loading, setLoading] = useState(false)

  const fetchVotes = useCallback(async () => {
    try {
      const response = await fetch(`/api/${entityType === 'defense' ? 'defenses' : 'counters'}/${entityId}/votes`)
      if (response.ok) {
        const data = await response.json()
        setLikes(data.likes)
        setDislikes(data.dislikes)
        setUserVote(data.userVote)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des votes:', error)
    }
  }, [entityId, entityType])

  useEffect(() => {
    fetchVotes()
  }, [fetchVotes])

  const handleVote = async (voteType: 'like' | 'dislike') => {
    if (loading) return

    // Si on clique sur le même vote, on le retire
    const newVoteType = userVote === voteType ? null : voteType

    setLoading(true)
    try {
      if (newVoteType === null) {
        // Supprimer le vote
        const response = await fetch(`/api/${entityType === 'defense' ? 'defenses' : 'counters'}/${entityId}/votes`, {
          method: 'DELETE',
        })

        if (response.ok) {
          const data = await response.json()
          setLikes(data.likes)
          setDislikes(data.dislikes)
          setUserVote(null)
        }
      } else {
        // Créer ou modifier le vote
        const response = await fetch(`/api/${entityType === 'defense' ? 'defenses' : 'counters'}/${entityId}/votes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ voteType: newVoteType }),
        })

        if (response.ok) {
          const data = await response.json()
          setLikes(data.likes)
          setDislikes(data.dislikes)
          setUserVote(data.vote.voteType)
        }
      }
    } catch (error) {
      console.error('Erreur lors du vote:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          handleVote('like')
        }}
        disabled={loading}
        className={`flex items-center gap-2 px-3 py-1 rounded-lg transition-colors ${
          userVote === 'like'
            ? 'bg-green-600 text-white'
            : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
        }`}
      >
        <span>👍</span>
        <span className="text-sm font-medium">{likes}</span>
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          handleVote('dislike')
        }}
        disabled={loading}
        className={`flex items-center gap-2 px-3 py-1 rounded-lg transition-colors ${
          userVote === 'dislike'
            ? 'bg-red-600 text-white'
            : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
        }`}
      >
        <span>👎</span>
        <span className="text-sm font-medium">{dislikes}</span>
      </button>
    </div>
  )
}

