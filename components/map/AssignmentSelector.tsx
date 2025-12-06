'use client'

import { useState, useEffect, useCallback } from 'react'
import { getMonstersFromCache, preloadMonsterImages, getAllMonsterImages } from '@/lib/monster-cache'
import { useI18n } from '@/lib/i18n-provider'
import { getMonsterDisplayName } from '@/lib/monster-utils'

interface Assignment {
  defenseId: string
  defense: {
    id: string
    leaderMonster: string
    monster2: string
    monster3: string
    strengths: string | null
    weaknesses: string | null
    notes: string | null
    createdAt: string
    updatedAt: string
  }
  users: Array<{
    assignmentId: string
    id: string
    name: string | null
    identifier: string
    assignedAt: string
    assignedBy: string
  }>
}

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

interface AssignmentSelectorProps {
  onSelect: (assignment: { defenseId: string, userId: string }) => void
  excludeAssignments?: Array<{ defenseId: string, userId: string }>
  allTowers?: MapTower[]
  currentTowerId?: string
}

export function AssignmentSelector({ onSelect, excludeAssignments = [], allTowers = [], currentTowerId }: AssignmentSelectorProps) {
  const { t } = useI18n()
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDefenseId, setSelectedDefenseId] = useState<string | null>(null)
  const [monsterImages, setMonsterImages] = useState<Record<string, string>>({})
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchAssignments()
  }, [])

  const fetchMonsterImages = useCallback(async () => {
    const monstersToFetch: string[] = []
    assignments.forEach(assignment => {
      if (assignment.defense.leaderMonster) monstersToFetch.push(assignment.defense.leaderMonster)
      if (assignment.defense.monster2) monstersToFetch.push(assignment.defense.monster2)
      if (assignment.defense.monster3) monstersToFetch.push(assignment.defense.monster3)
    })
    
    if (monstersToFetch.length === 0) return

    await getMonstersFromCache()
    const images = await preloadMonsterImages(monstersToFetch)
    setMonsterImages(images)
  }, [assignments])

  useEffect(() => {
    if (assignments.length > 0) {
      fetchMonsterImages()
      setFailedImages(new Set())
    }
  }, [assignments, fetchMonsterImages])

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

  const fetchAssignments = async () => {
    try {
      const response = await fetch('/api/gestion/assignments')
      if (response.ok) {
        const data = await response.json()
        setAssignments(data.assignments || [])
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des affectations:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredAssignments = assignments.filter(assignment => {
    if (searchTerm === '') return true
    const searchLower = searchTerm.toLowerCase()
    // Rechercher dans les noms d'affichage (sans les IDs)
    const leaderName = getMonsterDisplayName(assignment.defense.leaderMonster).toLowerCase()
    const monster2Name = getMonsterDisplayName(assignment.defense.monster2).toLowerCase()
    const monster3Name = getMonsterDisplayName(assignment.defense.monster3).toLowerCase()
    return leaderName.includes(searchLower) || monster2Name.includes(searchLower) || monster3Name.includes(searchLower)
  })

  const selectedAssignment = selectedDefenseId 
    ? assignments.find(a => a.defenseId === selectedDefenseId)
    : null

  const isExcluded = (defenseId: string, userId: string) => {
    return excludeAssignments.some(
      excl => excl.defenseId === defenseId && excl.userId === userId
    )
  }

  if (loading) {
    return <div className="text-sm text-gray-400">{t('common.loading') || 'Chargement...'}</div>
  }

  if (assignments.length === 0) {
    return (
      <div className="text-sm text-gray-400 text-center py-4">
        {t('map.noAssignmentsAvailable') || 'Aucune affectation disponible'}
      </div>
    )
  }

  // Si une défense est sélectionnée, afficher les utilisateurs
  if (selectedAssignment) {
    const availableUsers = selectedAssignment.users.filter(user => {
      // Exclure si déjà dans excludeAssignments
      if (isExcluded(selectedAssignment.defenseId, user.id)) {
        return false
      }
      
      // Vérifier si cette défense avec cet utilisateur est déjà assignée dans une autre tour
      if (user.id && allTowers.length > 0) {
        const isAlreadyAssignedElsewhere = allTowers.some(t => {
          if (currentTowerId && t.id === currentTowerId) return false // Exclure la tour actuelle
          try {
            const parsed = JSON.parse(t.defenseIds || '[]')
            if (Array.isArray(parsed)) {
              return parsed.some((item: any) => {
                const defenseId = typeof item === 'string' ? item : item?.defenseId
                const userId = typeof item === 'object' ? item?.userId : ''
                return defenseId === selectedAssignment.defenseId && userId === user.id
              })
            }
          } catch {
            return false
          }
          return false
        })
        
        if (isAlreadyAssignedElsewhere) {
          return false
        }
      }
      
      return true
    })

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-white font-medium text-sm">
            {t('map.selectUser') || 'Sélectionner un utilisateur'}
          </h3>
          <button
            type="button"
            onClick={() => setSelectedDefenseId(null)}
            className="text-gray-400 hover:text-white text-sm"
          >
            ← {t('common.back') || 'Retour'}
          </button>
        </div>
        
        <div className="p-3 bg-slate-700 rounded-lg mb-2">
          <div className="flex items-center gap-2">
            <div className="flex gap-1 flex-shrink-0">
              {renderMonsterIcon(selectedAssignment.defense.leaderMonster, 'L')}
              {renderMonsterIcon(selectedAssignment.defense.monster2, 'M2')}
              {renderMonsterIcon(selectedAssignment.defense.monster3, 'M3')}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-white font-medium truncate">
                {getMonsterDisplayName(selectedAssignment.defense.leaderMonster)} / {getMonsterDisplayName(selectedAssignment.defense.monster2)} / {getMonsterDisplayName(selectedAssignment.defense.monster3)}
              </div>
            </div>
          </div>
        </div>

        <div className="max-h-60 overflow-y-auto space-y-1">
          {availableUsers.length === 0 ? (
            <div className="text-sm text-gray-400 text-center py-4">
              {t('map.noUsersAvailable') || 'Aucun utilisateur disponible'}
            </div>
          ) : (
            availableUsers.map((user) => (
              <button
                key={user.id}
                onClick={() => {
                  onSelect({
                    defenseId: selectedAssignment.defenseId,
                    userId: user.id
                  })
                  setSelectedDefenseId(null)
                }}
                className="w-full text-left px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
              >
                <div className="text-sm text-white font-medium">
                  {user.name || user.identifier}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    )
  }

  // Afficher la liste des défenses avec affectations
  return (
    <div className="space-y-2">
      <input
        type="text"
        placeholder={t('map.searchDefense') || 'Rechercher une défense...'}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <div className="max-h-60 overflow-y-auto space-y-1">
        {filteredAssignments.length === 0 ? (
          <div className="text-sm text-gray-400 text-center py-4">
            {t('map.noDefensesFound') || 'Aucune défense trouvée'}
          </div>
        ) : (
          filteredAssignments.map((assignment) => (
            <button
              key={assignment.defenseId}
              onClick={() => setSelectedDefenseId(assignment.defenseId)}
              className="w-full text-left px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="flex gap-1 flex-shrink-0">
                  {renderMonsterIcon(assignment.defense.leaderMonster, 'L')}
                  {renderMonsterIcon(assignment.defense.monster2, 'M2')}
                  {renderMonsterIcon(assignment.defense.monster3, 'M3')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white font-medium truncate">
                    {getMonsterDisplayName(assignment.defense.leaderMonster)} / {getMonsterDisplayName(assignment.defense.monster2)} / {getMonsterDisplayName(assignment.defense.monster3)}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {assignment.users.length} {assignment.users.length > 1 ? t('map.users') || 'utilisateurs' : t('map.user') || 'utilisateur'}
                  </div>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}

