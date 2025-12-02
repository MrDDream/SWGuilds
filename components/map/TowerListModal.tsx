'use client'

import { useState, useEffect, useCallback } from 'react'
import { Defense } from '@/types/defense'
import { getMonstersFromCache, preloadMonsterImages, getAllMonsterImages } from '@/lib/monster-cache'

interface MapTower {
  id: string
  mapName: string
  towerNumber: string
  name: string | null
  stars: number
  color?: string
  x: number
  y: number
  width: number
  height: number
  defenseIds: string
  createdAt: string
  updatedAt: string
  createdBy: string
}

interface TowerListModalProps {
  towers: MapTower[]
  onClose: () => void
  onTowerClick: (tower: MapTower) => void
}

// Fonction de tri des tours
function sortTowers(towers: MapTower[]): MapTower[] {
  const colorOrder: Record<string, number> = { blue: 0, red: 1, yellow: 2 }
  
  return [...towers].sort((a, b) => {
    // Trier d'abord par couleur
    const colorA = (a.color || 'blue').toLowerCase()
    const colorB = (b.color || 'blue').toLowerCase()
    const colorDiff = (colorOrder[colorA] ?? 999) - (colorOrder[colorB] ?? 999)
    
    if (colorDiff !== 0) {
      return colorDiff
    }
    
    // Ensuite trier par numéro (QG en dernier)
    const numA = a.towerNumber.toUpperCase()
    const numB = b.towerNumber.toUpperCase()
    
    // Si les deux sont QG, garder l'ordre
    if (numA === 'QG' && numB === 'QG') {
      return 0
    }
    
    // QG va toujours en dernier
    if (numA === 'QG') return 1
    if (numB === 'QG') return -1
    
    // Comparer les numéros numériquement
    const numAInt = parseInt(numA)
    const numBInt = parseInt(numB)
    
    if (!isNaN(numAInt) && !isNaN(numBInt)) {
      return numAInt - numBInt
    }
    
    // Si l'un n'est pas un nombre, le mettre après
    if (isNaN(numAInt)) return 1
    if (isNaN(numBInt)) return -1
    
    return 0
  })
}

export function TowerListModal({ towers, onClose, onTowerClick }: TowerListModalProps) {
  const [defensesMap, setDefensesMap] = useState<Record<string, Defense[]>>({})
  const [monsterImages, setMonsterImages] = useState<Record<string, string>>({})
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  const sortedTowers = sortTowers(towers)

  const fetchAllDefenses = useCallback(async () => {
    setLoading(true)
    const defenses: Record<string, Defense[]> = {}
    
    try {
      const promises = towers.map(async (tower) => {
        if (!tower.defenseIds) {
          defenses[tower.id] = []
          return
        }
        
        const parsed = JSON.parse(tower.defenseIds || '[]')
        let ids: string[] = []
        
        // Gérer l'ancien format (array de strings) et le nouveau format (array d'objets)
        if (Array.isArray(parsed)) {
          if (parsed.length > 0 && typeof parsed[0] === 'string') {
            // Ancien format
            ids = parsed
          } else {
            // Nouveau format: extraire les defenseIds
            ids = parsed.map((item: any) => item?.defenseId).filter(Boolean)
          }
        }
        
        if (ids.length === 0) {
          defenses[tower.id] = []
          return
        }
        
        try {
          const defensePromises = ids.map(id => 
            fetch(`/api/defenses/${id}`).then(r => r.ok ? r.json() : null)
          )
          const results = await Promise.all(defensePromises)
          defenses[tower.id] = results.filter(Boolean)
        } catch (error) {
          console.error(`Erreur lors de la récupération des défenses pour la tour ${tower.id}:`, error)
          defenses[tower.id] = []
        }
      })
      
      await Promise.all(promises)
      setDefensesMap(defenses)
    } catch (error) {
      console.error('Erreur lors de la récupération des défenses:', error)
    } finally {
      setLoading(false)
    }
  }, [towers])

  const fetchMonsterImages = useCallback(async () => {
    const allMonsterNames = new Set<string>()
    
    Object.values(defensesMap).forEach(defenses => {
      defenses.forEach(defense => {
        if (defense.leaderMonster) allMonsterNames.add(defense.leaderMonster)
        if (defense.monster2) allMonsterNames.add(defense.monster2)
        if (defense.monster3) allMonsterNames.add(defense.monster3)
      })
    })
    
    if (allMonsterNames.size === 0) return
    
    try {
      await getMonstersFromCache()
      const images = await preloadMonsterImages(Array.from(allMonsterNames))
      setMonsterImages(images)
    } catch (error) {
      console.error('Erreur lors de la récupération des images:', error)
    }
  }, [defensesMap])

  useEffect(() => {
    fetchAllDefenses()
  }, [fetchAllDefenses])

  useEffect(() => {
    if (Object.keys(defensesMap).length > 0) {
      fetchMonsterImages()
    }
  }, [defensesMap, fetchMonsterImages])

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
    
    return (
      <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center overflow-hidden relative border-2 border-slate-600 flex-shrink-0">
        {imageUrl && !hasFailed ? (
          <img
            src={imageUrl}
            alt={monsterName || fallbackText}
            className="w-full h-full object-cover"
            onError={(e) => handleImageError(e, monsterName)}
          />
        ) : (
          <span className="text-xs text-center text-white px-1">{monsterName || fallbackText}</span>
        )}
      </div>
    )
  }

  const getColorClass = (color?: string) => {
    const c = (color || 'blue').toLowerCase()
    if (c === 'red') return 'bg-red-600'
    if (c === 'yellow') return 'bg-yellow-600'
    return 'bg-blue-600'
  }

  const getColorName = (color?: string) => {
    const c = (color || 'blue').toLowerCase()
    if (c === 'red') return 'Rouge'
    if (c === 'yellow') return 'Jaune'
    return 'Bleu'
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-slate-800 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">
            Liste des tours
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            title="Fermer"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="text-gray-400 text-center py-8">Chargement des tours...</div>
        ) : sortedTowers.length === 0 ? (
          <div className="text-gray-400 text-center py-8">Aucune tour trouvée</div>
        ) : (
          <div className="space-y-3">
            {sortedTowers.map((tower) => {
              const defenses = defensesMap[tower.id] || []
              
              return (
                <div
                  key={tower.id}
                  onClick={() => {
                    onTowerClick(tower)
                    onClose()
                  }}
                  className="bg-slate-700 p-4 rounded-lg border border-slate-600 hover:bg-slate-600 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    {/* Indicateur de couleur */}
                    <div className={`w-4 h-4 rounded-full ${getColorClass(tower.color)} flex-shrink-0`} title={getColorName(tower.color)} />
                    
                    {/* Numéro et étoiles */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-white font-bold text-lg min-w-[40px]">
                        {tower.towerNumber}
                      </span>
                      <span className="text-yellow-400 text-sm">
                        {tower.stars === 4 ? '4' : '5'} ⭐
                      </span>
                    </div>
                    
                    {/* Défenses */}
                    <div className="flex-1 min-w-0">
                      {defenses.length === 0 ? (
                        <span className="text-gray-400 text-sm">Aucune défense assignée</span>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {defenses.slice(0, 5).map((defense, idx) => (
                            <div key={defense.id || idx} className="flex gap-1">
                              {renderMonsterIcon(defense.leaderMonster, 'L')}
                              {renderMonsterIcon(defense.monster2, 'M2')}
                              {renderMonsterIcon(defense.monster3, 'M3')}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

