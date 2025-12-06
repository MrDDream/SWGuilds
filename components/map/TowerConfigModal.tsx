'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { AssignmentSelector } from './AssignmentSelector'
import { Defense } from '@/types/defense'
import { useRouter } from 'next/navigation'
import { getMonstersFromCache, preloadMonsterImages, getAllMonsterImages } from '@/lib/monster-cache'
import { useI18n } from '@/lib/i18n-provider'
import { getMonsterDisplayName } from '@/lib/monster-utils'

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

interface TowerConfigModalProps {
  tower: MapTower | null
  onClose: () => void
  onSave: (tower: MapTower) => void
  onDelete?: (towerId: string) => void
  allTowers?: MapTower[]
}

export function TowerConfigModal({ tower, onClose, onSave, onDelete, allTowers = [] }: TowerConfigModalProps) {
  const router = useRouter()
  const { t } = useI18n()
  const [towerNumber, setTowerNumber] = useState<string>('1')
  const [stars, setStars] = useState(5)
  const [color, setColor] = useState<'blue' | 'red' | 'yellow'>('blue')
  const [defenseAssignments, setDefenseAssignments] = useState<Array<{ defenseId: string, userId: string }>>([])
  const [defenses, setDefenses] = useState<Defense[]>([])
  const [userNames, setUserNames] = useState<Record<string, string>>({}) // userId -> name
  const [showAssignmentSelector, setShowAssignmentSelector] = useState(false)
  const [loading, setLoading] = useState(false)
  const [monsterImages, setMonsterImages] = useState<Record<string, string>>({})
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (tower) {
      setTowerNumber(String(tower.towerNumber))
      setStars(tower.stars)
      setColor((tower as any).color || 'blue')
      try {
        const parsed = JSON.parse(tower.defenseIds || '[]')
        // Gérer l'ancien format (array de strings) et le nouveau format (array d'objets)
        if (Array.isArray(parsed)) {
          if (parsed.length > 0 && typeof parsed[0] === 'string') {
            // Ancien format: convertir en nouveau format
            setDefenseAssignments(parsed.map(id => ({ defenseId: id, userId: '' })))
          } else {
            // Nouveau format
            setDefenseAssignments(parsed.filter((item: any) => item && item.defenseId))
          }
        } else {
          setDefenseAssignments([])
        }
      } catch {
        setDefenseAssignments([])
      }
    }
  }, [tower])

  const fetchDefenses = useCallback(async () => {
    if (!tower || defenseAssignments.length === 0) {
      setDefenses([])
      return
    }

    try {
      const uniqueDefenseIds = [...new Set(defenseAssignments.map(a => a.defenseId))]
      const promises = uniqueDefenseIds.map(async (id: string) => {
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
      const results = await Promise.all(promises)
      setDefenses(results.filter(Boolean))
    } catch (error) {
      console.error('Erreur lors de la récupération des défenses:', error)
    }
  }, [tower, defenseAssignments])

  const fetchUserNames = useCallback(async () => {
    if (!tower || defenseAssignments.length === 0) {
      setUserNames({})
      return
    }

    try {
      const userIds = defenseAssignments.map(a => a.userId).filter(Boolean)
      if (userIds.length === 0) {
        setUserNames({})
        return
      }

      const response = await fetch('/api/users')
      if (response.ok) {
        const users = await response.json()
        const namesMap: Record<string, string> = {}
        users.forEach((user: any) => {
          if (userIds.includes(user.id)) {
            namesMap[user.id] = user.name || user.identifier
          }
        })
        setUserNames(namesMap)
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des noms d\'utilisateurs:', error)
    }
  }, [tower, defenseAssignments])

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
    if (tower && defenseAssignments.length > 0) {
      fetchDefenses()
      fetchUserNames()
    } else {
      setDefenses([])
      setUserNames({})
    }
  }, [tower, defenseAssignments, fetchDefenses, fetchUserNames])

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
    
    return (
      <div className="w-12 h-12 bg-slate-700 rounded-lg flex items-center justify-center overflow-hidden relative border-2 border-slate-600 flex-shrink-0">
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

  const handleAddAssignment = (assignment: { defenseId: string, userId: string }) => {
    if (defenseAssignments.length >= 5) {
      alert(t('map.maxDefensesPerTower'))
      return
    }
    
    // Vérifier si cette défense avec cet utilisateur est déjà assignée ailleurs
    if (assignment.userId) {
      const isAlreadyAssigned = allTowers.some(t => {
        if (t.id === tower?.id) return false // Exclure la tour actuelle
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
      
      // Ne pas afficher de message d'erreur, simplement ne pas ajouter l'assignation
      if (isAlreadyAssigned) {
        return
      }
    }
    
    setDefenseAssignments([...defenseAssignments, assignment])
    setShowAssignmentSelector(false)
  }

  const handleRemoveAssignment = (index: number) => {
    setDefenseAssignments(defenseAssignments.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    if (!tower) return

    setLoading(true)
    try {
      const response = await fetch(`/api/map/towers/${tower.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          towerNumber,
          stars,
          color,
          defenseIds: defenseAssignments,
        }),
      })

      if (response.ok) {
        const updatedTower = await response.json()
        onSave(updatedTower)
        onClose()
      } else {
        const error = await response.json()
        alert(error.error || t('map.towerUpdateError'))
      }
    } catch (error) {
      console.error('Erreur:', error)
      alert(t('map.towerUpdateError'))
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!tower || !onDelete) return

    const confirmed = window.confirm(
      t('map.deleteTowerConfirm', { number: tower.towerNumber })
    )

    if (!confirmed) return

    setLoading(true)
    try {
      const response = await fetch(`/api/map/towers/${tower.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        onDelete(tower.id)
        onClose()
      } else {
        const error = await response.json()
        alert(error.error || t('map.towerDeleteError'))
      }
    } catch (error) {
      console.error('Erreur:', error)
      alert(t('map.towerDeleteError'))
    } finally {
      setLoading(false)
    }
  }


  if (!tower) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-slate-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-white mb-4">
          {t('map.towerConfig')} {tower.towerNumber}
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-blue-400 mb-2">
              {t('map.towerNumber')}
            </label>
            <select
              value={towerNumber}
              onChange={(e) => setTowerNumber(e.target.value)}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="QG">QG</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((num) => (
                <option key={num} value={String(num)}>
                  {num}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-blue-400 mb-2">
              {t('map.towerStars')}
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStars(4)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  stars === 4
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                }`}
              >
                4 ⭐
              </button>
              <button
                type="button"
                onClick={() => setStars(5)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  stars === 5
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                }`}
              >
                5 ⭐
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-blue-400 mb-2">
              {t('map.towerColor')}
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setColor('blue')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  color === 'blue'
                    ? 'bg-blue-600 text-white border-2 border-blue-400'
                    : 'bg-slate-700 text-gray-300 hover:bg-slate-600 border-2 border-transparent'
                }`}
              >
                {t('map.blue')}
              </button>
              <button
                type="button"
                onClick={() => setColor('red')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  color === 'red'
                    ? 'bg-red-600 text-white border-2 border-red-400'
                    : 'bg-slate-700 text-gray-300 hover:bg-slate-600 border-2 border-transparent'
                }`}
              >
                {t('map.red')}
              </button>
              <button
                type="button"
                onClick={() => setColor('yellow')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  color === 'yellow'
                    ? 'bg-yellow-600 text-white border-2 border-yellow-400'
                    : 'bg-slate-700 text-gray-300 hover:bg-slate-600 border-2 border-transparent'
                }`}
              >
                {t('map.yellow')}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-blue-400 mb-2">
              {t('map.towerDefenses')} ({defenseAssignments.length}/5)
            </label>
            <div className="space-y-2">
              {defenseAssignments.map((assignment, index) => {
                const defense = defenses.find(d => d.id === assignment.defenseId)
                const userName = assignment.userId ? (userNames[assignment.userId] || assignment.userId) : ''
                
                return (
                  <div
                    key={`${assignment.defenseId}-${assignment.userId}-${index}`}
                    className="flex items-center justify-between p-3 bg-slate-700 rounded-lg"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {defense && (
                        <>
                          <div className="flex gap-1 flex-shrink-0">
                            {renderMonsterIcon(defense.leaderMonster, 'L')}
                            {renderMonsterIcon(defense.monster2, 'M2')}
                            {renderMonsterIcon(defense.monster3, 'M3')}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-white font-medium truncate">
                              {getMonsterDisplayName(defense.leaderMonster)} / {getMonsterDisplayName(defense.monster2)} / {getMonsterDisplayName(defense.monster3)}
                            </div>
                            {userName && (
                              <div className="text-xs text-blue-400 mt-1">
                                {userName}
                              </div>
                            )}
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
                        </>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveAssignment(index)}
                      className="text-red-400 hover:text-red-300 flex-shrink-0 ml-2"
                    >
                      ✕
                    </button>
                  </div>
                )
              })}
              {defenseAssignments.length < 5 && (
                <div className="space-y-2">
                  {!showAssignmentSelector ? (
                    <Button
                      type="button"
                      onClick={() => setShowAssignmentSelector(true)}
                      className="w-full"
                    >
                      {t('map.selectDefense')}
                    </Button>
                  ) : (
                    <div className="p-4 bg-slate-700 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-white font-medium">{t('map.selectDefense')}</h3>
                        <button
                          type="button"
                          onClick={() => setShowAssignmentSelector(false)}
                          className="text-gray-400 hover:text-white"
                        >
                          ✕
                        </button>
                      </div>
                      <AssignmentSelector
                        onSelect={handleAddAssignment}
                        excludeAssignments={defenseAssignments}
                        allTowers={allTowers}
                        currentTowerId={tower?.id}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 mt-6">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="flex-1"
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="flex-1"
            >
              {loading ? t('common.saving') : t('map.saveChanges')}
            </Button>
          </div>
          {onDelete && (
            <Button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 text-white"
            >
              {loading ? t('common.saving') : t('map.deleteTower')}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

