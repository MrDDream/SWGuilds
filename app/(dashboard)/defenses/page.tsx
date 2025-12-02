'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Defense } from '@/types/defense'
import { DefenseCard } from '@/components/defenses/DefenseCard'
import { Button } from '@/components/ui/Button'
import { useI18n } from '@/lib/i18n-provider'

export default function DefensesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useI18n()
  const userId = searchParams.get('userId')
  const [defenses, setDefenses] = useState<(Defense & { likes?: number; dislikes?: number })[]>([])
  const [filteredDefenses, setFilteredDefenses] = useState<(Defense & { likes?: number; dislikes?: number })[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTagId, setSelectedTagId] = useState<string | null | 'none'>('all')
  const [sortBy, setSortBy] = useState<'recent' | 'most-liked' | 'least-liked'>('recent')
  const [tags, setTags] = useState<any[]>([])
  const [userInfo, setUserInfo] = useState<{ identifier: string; name: string | null } | null>(null)

  const fetchDefenses = useCallback(async () => {
    try {
      let url = '/api/defenses'
      
      if (userId) {
        url += `?userId=${userId}`
        // Récupérer les infos de l'utilisateur
        const userResponse = await fetch(`/api/admin/users`)
        if (userResponse.ok) {
          const users = await userResponse.json()
          const user = users.find((u: any) => u.id === userId)
          if (user) {
            setUserInfo({ identifier: user.identifier, name: user.name })
          }
        }
      }
      
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setDefenses(data)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des défenses:', error)
    } finally {
      setLoading(false)
    }
  }, [userId])

  const fetchTags = useCallback(async () => {
    try {
      const response = await fetch('/api/tags')
      if (response.ok) {
        const data = await response.json()
        setTags(data)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des tags:', error)
    }
  }, [])

  useEffect(() => {
    fetchDefenses()
    fetchTags()
  }, [fetchDefenses, fetchTags])

  // Filtrer et trier les défenses par nom de monstre, tag et tri
  useEffect(() => {
    let filtered = [...defenses]

    // Filtrer par tag
    if (selectedTagId === 'none') {
      // Afficher uniquement les défenses sans tag
      filtered = filtered.filter(defense => 
        !defense.tags || defense.tags.length === 0
      )
    } else if (selectedTagId && selectedTagId !== 'all') {
      // Filtrer par tag spécifique
      filtered = filtered.filter(defense => 
        defense.tags?.some(dt => dt.tag.id === selectedTagId)
      )
    }

    // Filtrer par nom de monstre
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(defense => {
        const leaderMonster = defense.leaderMonster?.toLowerCase() || ''
        const monster2 = defense.monster2?.toLowerCase() || ''
        const monster3 = defense.monster3?.toLowerCase() || ''
        
        return leaderMonster.includes(query) || 
               monster2.includes(query) || 
               monster3.includes(query)
      })
    }

    // Trier les défenses
    filtered.sort((a, b) => {
      if (sortBy === 'most-liked') {
        const likesA = a.likes || 0
        const likesB = b.likes || 0
        if (likesB !== likesA) {
          return likesB - likesA
        }
        // En cas d'égalité, trier par date de mise à jour décroissante
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      } else if (sortBy === 'least-liked') {
        const likesA = a.likes || 0
        const likesB = b.likes || 0
        if (likesA !== likesB) {
          return likesA - likesB
        }
        // En cas d'égalité, trier par date de mise à jour décroissante
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      } else {
        // 'recent' - trier par date de mise à jour décroissante
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      }
    })
    
    setFilteredDefenses(filtered)
  }, [searchQuery, selectedTagId, sortBy, defenses])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-400">{t('defenses.loading')}</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {userId && userInfo 
              ? t('defenses.userDefenses', { name: userInfo.name || userInfo.identifier })
              : t('defenses.title')
            }
          </h1>
          <p className="text-gray-400">
            {userId && userInfo 
              ? t('defenses.defensesByUser')
              : t('defenses.manageDefenses')
            }
          </p>
        </div>
        {!userId && (
          <Button onClick={() => router.push('/defenses/new')}>
            + {t('defenses.newDefense')}
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex gap-4">
          <select
            value={selectedTagId === null ? 'all' : selectedTagId}
            onChange={(e) => {
              const value = e.target.value
              setSelectedTagId(value === 'all' ? null : (value === 'none' ? 'none' : value))
            }}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">{t('defenses.allTags')}</option>
            <option value="none">{t('defenses.noTag')}</option>
            {tags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'recent' | 'most-liked' | 'least-liked')}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="recent">{t('defenses.sortRecent')}</option>
            <option value="most-liked">{t('defenses.sortMostLiked')}</option>
            <option value="least-liked">{t('defenses.sortLeastLiked')}</option>
          </select>
        </div>
        <div className="flex-1 max-w-md">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('defenses.searchMonster')}
            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {filteredDefenses.length === 0 ? (
        <div className="bg-slate-800 rounded-lg p-12 text-center">
          <p className="text-gray-400 mb-4">
            {searchQuery || (selectedTagId && selectedTagId !== null) 
              ? t('defenses.noDefensesSearch')
              : t('defenses.noDefenses')}
          </p>
          {!userId && !searchQuery && (!selectedTagId || selectedTagId === null) && (
            <Button onClick={() => router.push('/defenses/new')}>
              {t('defenses.createFirst')}
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDefenses.map((defense) => (
            <DefenseCard key={defense.id} defense={defense} />
          ))}
        </div>
      )}
    </div>
  )
}

