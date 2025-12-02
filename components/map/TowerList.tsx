'use client'

import { useState, useEffect, useCallback } from 'react'
import { Defense } from '@/types/defense'
import { getMonstersFromCache, preloadMonsterImages, getAllMonsterImages } from '@/lib/monster-cache'
import { useI18n } from '@/lib/i18n-provider'

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

interface TowerListProps {
  towers: MapTower[]
  onTowerClick: (tower: MapTower) => void
  isEditing?: boolean
  showNames?: boolean
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

export function TowerList({ towers, onTowerClick, isEditing = false, showNames = false }: TowerListProps) {
  const { t } = useI18n()
  const [defensesMap, setDefensesMap] = useState<Record<string, Defense[]>>({})
  const [assignmentsMap, setAssignmentsMap] = useState<Record<string, Array<{ defenseId: string, userId: string }>>>({})
  const [userNames, setUserNames] = useState<Record<string, string>>({})
  const [monsterImages, setMonsterImages] = useState<Record<string, string>>({})
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  const sortedTowers = sortTowers(towers)

  const fetchAllDefenses = useCallback(async () => {
    setLoading(true)
    const defenses: Record<string, Defense[]> = {}
    const assignments: Record<string, Array<{ defenseId: string, userId: string }>> = {}
    
    try {
      const promises = towers.map(async (tower) => {
        if (!tower.defenseIds) {
          defenses[tower.id] = []
          assignments[tower.id] = []
          return
        }
        
        const parsed = JSON.parse(tower.defenseIds || '[]')
        let defenseAssignments: Array<{ defenseId: string, userId: string }> = []
        
        // Gérer l'ancien format (array de strings) et le nouveau format (array d'objets)
        if (Array.isArray(parsed)) {
          if (parsed.length > 0 && typeof parsed[0] === 'string') {
            // Ancien format: convertir en nouveau format
            defenseAssignments = parsed.map((id: string) => ({ defenseId: id, userId: '' }))
          } else {
            // Nouveau format
            defenseAssignments = parsed.filter((item: any) => item && item.defenseId)
          }
        }
        
        assignments[tower.id] = defenseAssignments
        
        if (defenseAssignments.length === 0) {
          defenses[tower.id] = []
          return
        }
        
        try {
          const uniqueDefenseIds = [...new Set(defenseAssignments.map(a => a.defenseId))]
          const defensePromises = uniqueDefenseIds.map(async (id: string) => {
            try {
              const response = await fetch(`/api/defenses/${id}`)
              if (response.ok) {
                return await response.json()
              } else if (response.status === 404) {
                // Défense supprimée, ignorer silencieusement
                return null
              } else {
                console.warn(`Erreur lors du chargement de la défense ${id}: ${response.status}`)
                return null
              }
            } catch (error) {
              console.warn(`Erreur lors du chargement de la défense ${id}:`, error)
              return null
            }
          })
          const results = await Promise.all(defensePromises)
          defenses[tower.id] = results.filter(Boolean)
        } catch (error) {
          console.error(`Erreur lors de la récupération des défenses pour la tour ${tower.id}:`, error)
          defenses[tower.id] = []
        }
      })
      
      await Promise.all(promises)
      setDefensesMap(defenses)
      setAssignmentsMap(assignments)
      
      // Récupérer les noms des utilisateurs
      await fetchUserNames(assignments)
    } catch (error) {
      console.error('Erreur lors de la récupération des défenses:', error)
    } finally {
      setLoading(false)
    }
  }, [towers])

  const fetchUserNames = async (assignmentsMap: Record<string, Array<{ defenseId: string, userId: string }>>) => {
    const allUserIds = new Set<string>()
    Object.values(assignmentsMap).forEach(assignments => {
      assignments.forEach(assignment => {
        if (assignment.userId) {
          allUserIds.add(assignment.userId)
        }
      })
    })
    
    if (allUserIds.size === 0) {
      setUserNames({})
      return
    }
    
    try {
      const response = await fetch('/api/users')
      if (response.ok) {
        const users = await response.json()
        const namesMap: Record<string, string> = {}
        users.forEach((user: any) => {
          if (allUserIds.has(user.id)) {
            namesMap[user.id] = user.name || user.identifier
          }
        })
        setUserNames(namesMap)
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des noms d\'utilisateurs:', error)
    }
  }

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
      <div className="w-8 h-8 bg-slate-700 rounded flex items-center justify-center overflow-hidden relative border border-slate-600 flex-shrink-0">
        {imageUrl && !hasFailed ? (
          <img
            src={imageUrl}
            alt={monsterName || fallbackText}
            className="w-full h-full object-cover"
            onError={(e) => handleImageError(e, monsterName)}
          />
        ) : (
          <span className="text-[10px] text-center text-white px-0.5">{monsterName || fallbackText}</span>
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
    if (c === 'red') return t('map.red')
    if (c === 'yellow') return t('map.yellow')
    return t('map.blue')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[600px]">
        <div className="text-gray-400">{t('map.loadingTowers')}</div>
      </div>
    )
  }

  if (sortedTowers.length === 0) {
    return (
      <div className="flex items-center justify-center h-full min-h-[600px]">
        <div className="text-gray-400">{t('map.noTowersFound')}</div>
      </div>
    )
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {sortedTowers.map((tower) => {
          const defenses = defensesMap[tower.id] || []
          const assignments = assignmentsMap[tower.id] || []
          
          return (
            <div
              key={tower.id}
              onClick={() => {
                if (isEditing) {
                  onTowerClick(tower)
                }
              }}
              className={`bg-slate-800 rounded-lg p-3 border border-slate-700 relative ${
                isEditing ? 'hover:bg-slate-700 transition-colors cursor-pointer' : 'cursor-default'
              }`}
              style={{ minHeight: '200px' }}
            >
              {/* Indicateur de couleur et numéro en haut */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <div className={`w-3 h-3 rounded-full ${getColorClass(tower.color)}`} title={getColorName(tower.color)} />
                  <span className="text-white font-bold text-base">{tower.towerNumber}</span>
                </div>
                <span className="text-yellow-400 text-xs">
                  {tower.stars === 4 ? '4' : '5'} ⭐
                </span>
              </div>
              
              {/* Défenses */}
              {assignments.length === 0 ? (
                <div className="text-gray-400 text-xs text-center py-4">{t('map.noDefensesAssigned')}</div>
              ) : (
                <div className="space-y-1">
                  {showNames ? (
                    // Afficher les icônes en haut et les pseudos en dessous avec cadres (style affectations)
                    (() => {
                      // Filtrer les assignments pour exclure ceux déjà assignés ailleurs
                      const filteredAssignments = assignments.filter(assignment => {
                        if (!assignment.userId) return true
                        
                        // Vérifier si cette défense avec cet utilisateur est déjà assignée dans une autre tour
                        const isAlreadyAssignedElsewhere = towers.some(t => {
                          if (t.id === tower.id) return false // Exclure la tour actuelle
                          try {
                            const parsed = JSON.parse(t.defenseIds || '[]')
                            if (Array.isArray(parsed)) {
                              return parsed.some((item: any) => {
                                const defenseId = typeof item === 'string' ? item : item?.defenseId
                                const userId = typeof item === 'object' ? item?.userId : ''
                                return defenseId === assignment.defenseId && userId === assignment.userId
                              })
                            }
                          } catch {
                            return false
                          }
                          return false
                        })
                        
                        return !isAlreadyAssignedElsewhere
                      })
                      
                      const groupedByDefense: Record<string, string[]> = {}
                      filteredAssignments.forEach(assignment => {
                        if (!groupedByDefense[assignment.defenseId]) {
                          groupedByDefense[assignment.defenseId] = []
                        }
                        if (assignment.userId && userNames[assignment.userId]) {
                          if (!groupedByDefense[assignment.defenseId].includes(userNames[assignment.userId])) {
                            groupedByDefense[assignment.defenseId].push(userNames[assignment.userId])
                          }
                        }
                      })
                      
                      return Object.entries(groupedByDefense).slice(0, 5).map(([defenseId, users]) => {
                        const defense = defenses.find(d => d.id === defenseId)
                        if (!defense) return null
                        return (
                          <div key={defenseId} className="flex flex-col items-center gap-1">
                            <div className="flex gap-0.5 justify-center">
                              {renderMonsterIcon(defense.leaderMonster, 'L')}
                              {renderMonsterIcon(defense.monster2, 'M2')}
                              {renderMonsterIcon(defense.monster3, 'M3')}
                            </div>
                            <div className="space-y-1 w-full">
                              {users.length > 0 ? (
                                users.map((userName, idx) => (
                                  <div
                                    key={`${defenseId}-${userName}-${idx}`}
                                    className="bg-slate-800 px-2 py-1 rounded text-white text-xs text-center border border-slate-600"
                                  >
                                    {userName}
                                  </div>
                                ))
                              ) : (
                                <div className="text-xs text-gray-400 text-center">
                                  {t('map.notAssigned') || 'Non affecté'}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })
                    })()
                  ) : (
                    // Afficher les images : afficher toutes les affectations
                    assignments.slice(0, 5).map((assignment, idx) => {
                      const defense = defenses.find(d => d.id === assignment.defenseId)
                      if (!defense) return null
                      return (
                        <div key={`${assignment.defenseId}-${assignment.userId}-${idx}`} className="flex gap-0.5 justify-center">
                          {renderMonsterIcon(defense.leaderMonster, 'L')}
                          {renderMonsterIcon(defense.monster2, 'M2')}
                          {renderMonsterIcon(defense.monster3, 'M3')}
                        </div>
                      )
                    })
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

