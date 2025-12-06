'use client'

import { useState, useEffect, useCallback } from 'react'
import { Defense } from '@/types/defense'
import { getMonstersFromCache, preloadMonsterImages, getAllMonsterImages } from '@/lib/monster-cache'
import { getMonsterDisplayName } from '@/lib/monster-utils'

interface DefenseSelectorProps {
  onSelect: (defenseId: string) => void
  excludeIds?: string[]
}

export function DefenseSelector({ onSelect, excludeIds = [] }: DefenseSelectorProps) {
  const [defenses, setDefenses] = useState<Defense[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [monsterImages, setMonsterImages] = useState<Record<string, string>>({})
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchDefenses()
  }, [])

  const fetchMonsterImages = useCallback(async () => {
    const monstersToFetch: string[] = []
    defenses.forEach(defense => {
      if (defense.leaderMonster) monstersToFetch.push(defense.leaderMonster)
      if (defense.monster2) monstersToFetch.push(defense.monster2)
      if (defense.monster3) monstersToFetch.push(defense.monster3)
    })
    
    if (monstersToFetch.length === 0) return

    await getMonstersFromCache()
    const images = await preloadMonsterImages(monstersToFetch)
    setMonsterImages(images)
  }, [defenses])

  useEffect(() => {
    if (defenses.length > 0) {
      fetchMonsterImages()
      setFailedImages(new Set())
    }
  }, [defenses, fetchMonsterImages])

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>, monsterName: string) => {
    const img = e.currentTarget
    const currentSrc = img.src
    
    if (currentSrc.includes('swarfarm.com')) {
      setFailedImages(prev => new Set(prev).add(monsterName))
      return
    }
    
    const monsters = getAllMonsterImages()
    const swarfarmUrl = monsters[monsterName]
    if (swarfarmUrl && swarfarmUrl.includes('swarfarm.com')) {
      img.src = swarfarmUrl
      return
    }
    
    setFailedImages(prev => new Set(prev).add(monsterName))
  }

  const renderMonsterIcon = (monsterName: string, fallbackText: string) => {
    const imageUrl = monsterImages[monsterName]
    const hasFailed = failedImages.has(monsterName)
    const displayName = getMonsterDisplayName(monsterName)
    
    return (
      <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center overflow-hidden relative border-2 border-slate-600 flex-shrink-0">
        {imageUrl && !hasFailed ? (
          <img
            src={imageUrl}
            alt={displayName || fallbackText}
            className="w-full h-full object-cover"
            onError={(e) => handleImageError(e, monsterName)}
          />
        ) : (
          <span className="text-xs text-center text-white px-1">{displayName || fallbackText}</span>
        )}
      </div>
    )
  }

  const fetchDefenses = async () => {
    try {
      const response = await fetch('/api/defenses')
      if (response.ok) {
        const data = await response.json()
        setDefenses(data)
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des défenses:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredDefenses = defenses.filter(defense => {
    if (searchTerm === '') {
      return !excludeIds.includes(defense.id)
    }
    const searchLower = searchTerm.toLowerCase()
    // Rechercher dans les noms d'affichage (sans les IDs)
    const leaderName = getMonsterDisplayName(defense.leaderMonster).toLowerCase()
    const monster2Name = getMonsterDisplayName(defense.monster2).toLowerCase()
    const monster3Name = getMonsterDisplayName(defense.monster3).toLowerCase()
    const matchesSearch = leaderName.includes(searchLower) || monster2Name.includes(searchLower) || monster3Name.includes(searchLower)
    const notExcluded = !excludeIds.includes(defense.id)
    return matchesSearch && notExcluded
  })

  if (loading) {
    return <div className="text-sm text-gray-400">Chargement...</div>
  }

  return (
    <div className="space-y-2">
      <input
        type="text"
        placeholder="Rechercher une défense..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <div className="max-h-60 overflow-y-auto space-y-1">
        {filteredDefenses.length === 0 ? (
          <div className="text-sm text-gray-400 text-center py-4">
            Aucune défense trouvée
          </div>
        ) : (
          filteredDefenses.map((defense) => (
            <button
              key={defense.id}
              onClick={() => onSelect(defense.id)}
              className="w-full text-left px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="flex gap-1 flex-shrink-0">
                  {renderMonsterIcon(defense.leaderMonster, 'L')}
                  {renderMonsterIcon(defense.monster2, 'M2')}
                  {renderMonsterIcon(defense.monster3, 'M3')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white font-medium truncate">
                    {getMonsterDisplayName(defense.leaderMonster)} / {getMonsterDisplayName(defense.monster2)} / {getMonsterDisplayName(defense.monster3)}
                  </div>
                  {defense.tags && defense.tags.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {defense.tags.map((dt) => (
                        <span
                          key={dt.id}
                          className="text-xs px-2 py-0.5 rounded"
                          style={{ backgroundColor: dt.tag.color + '40', color: dt.tag.color }}
                        >
                          {dt.tag.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}

