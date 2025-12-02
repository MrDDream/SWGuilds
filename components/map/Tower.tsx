'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Draggable from 'react-draggable'
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

interface TowerProps {
  tower: MapTower
  isEditing: boolean
  onConfig: (tower: MapTower) => void
  onUpdate: (tower: MapTower, updates: Partial<MapTower>) => void
  mapScale: number
  showNames?: boolean
  allTowers?: MapTower[]
}

export function Tower({ tower, isEditing, onConfig, onUpdate, mapScale, showNames = false, allTowers = [] }: TowerProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [currentSize, setCurrentSize] = useState({ width: tower.width * mapScale, height: tower.height * mapScale })
  const nodeRef = useRef<HTMLDivElement>(null)
  const resizeHandleRef = useRef<HTMLDivElement>(null)
  const resizeStartRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null)
  const [defenses, setDefenses] = useState<Defense[]>([])
  const [monsterImages, setMonsterImages] = useState<Record<string, string>>({})
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())
  const [userNames, setUserNames] = useState<Record<string, string>>({})
  const [assignments, setAssignments] = useState<Array<{ defenseId: string, userId: string }>>([])

  // Mettre à jour currentSize quand la tour change ou que le scale change
  useEffect(() => {
    setCurrentSize({ width: tower.width * mapScale, height: tower.height * mapScale })
  }, [tower.width, tower.height, mapScale])

  const handleDrag = (e: any, data: any) => {
    if (!isEditing) return
    setIsDragging(true)
  }

  const handleDragStop = (e: any, data: any) => {
    if (!isEditing) return
    setIsDragging(false)
    onUpdate(tower, {
      x: data.x,
      y: data.y,
    })
  }

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    if (!isEditing || !nodeRef.current) return
    e.preventDefault()
    e.stopPropagation()
    setIsResizing(true)
    
    const rect = nodeRef.current.getBoundingClientRect()
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      width: rect.width,
      height: rect.height,
    }
  }, [isEditing])

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !resizeStartRef.current || !nodeRef.current) return
    e.preventDefault()
    
    const deltaY = e.clientY - resizeStartRef.current.y
    
    // resizeStartRef contient les dimensions réelles à l'écran, donc on divise par mapScale pour obtenir les dimensions originales
    const originalStartHeight = resizeStartRef.current.height / mapScale
    
    // Calculer la nouvelle hauteur originale (seulement en hauteur, pas en largeur)
    const newOriginalHeight = Math.max(60 / mapScale, originalStartHeight + deltaY / mapScale)
    
    // Calculer la taille des icônes en fonction de la nouvelle hauteur
    const newIconSize = Math.max(24, Math.min(48, newOriginalHeight / 6))
    // Calculer la largeur exacte basée sur la taille des icônes
    const newExactWidth = newIconSize * 3 + 4
    
    // Appliquer les dimensions originales (le scale du parent les mettra à l'échelle)
    nodeRef.current.style.width = `${newExactWidth}px`
    nodeRef.current.style.height = `${newOriginalHeight}px`
    
    // Mettre à jour la taille actuelle pour adapter les icônes (dimensions réelles à l'écran)
    setCurrentSize({ width: newExactWidth * mapScale, height: newOriginalHeight * mapScale })
  }, [isResizing, mapScale])

  const handleResizeEnd = useCallback((e: MouseEvent) => {
    if (!isResizing || !resizeStartRef.current || !nodeRef.current) return
    e.preventDefault()
    
    // Récupérer les dimensions originales depuis le style (elles sont déjà en dimensions originales)
    const computedStyle = window.getComputedStyle(nodeRef.current)
    const newHeight = parseFloat(computedStyle.height)
    
    // Calculer la taille des icônes en fonction de la nouvelle hauteur
    const newIconSize = Math.max(24, Math.min(48, newHeight / 6))
    // Calculer la largeur exacte basée sur la taille des icônes
    const newExactWidth = newIconSize * 3 + 4
    
    setIsResizing(false)
    
    onUpdate(tower, {
      width: newExactWidth,
      height: newHeight,
    })
    
    // Mettre à jour la taille actuelle avec les valeurs finales (dimensions réelles à l'écran)
    setCurrentSize({ width: newExactWidth * mapScale, height: newHeight * mapScale })
    
    resizeStartRef.current = null
  }, [isResizing, tower, mapScale, onUpdate])

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove)
      document.addEventListener('mouseup', handleResizeEnd)
      return () => {
        document.removeEventListener('mousemove', handleResizeMove)
        document.removeEventListener('mouseup', handleResizeEnd)
      }
    }
  }, [isResizing, handleResizeMove, handleResizeEnd])

  // Déterminer la couleur de la tour selon la couleur stockée ou le nombre d'étoiles
  const getTowerColor = () => {
    const towerColor = tower.color || 'blue'
    
    if (towerColor === 'red') {
      return 'bg-red-500/30 border-red-500/50'
    }
    if (towerColor === 'yellow') {
      return 'bg-yellow-500/30 border-yellow-500/50'
    }
    // Par défaut, bleu
    return 'bg-blue-500/30 border-blue-500/50'
  }

  // Obtenir la couleur de fond pour la barre du numéro et des étoiles
  const getBarColor = () => {
    const towerColor = tower.color || 'blue'
    
    if (towerColor === 'red') {
      return 'bg-red-500/80'
    }
    if (towerColor === 'yellow') {
      return 'bg-yellow-500/80'
    }
    // Par défaut, bleu
    return 'bg-blue-500/80'
  }

  // Obtenir la couleur de fond pour les cadres des pseudos
  const getPseudoBgColor = () => {
    const towerColor = tower.color || 'blue'
    
    if (towerColor === 'red') {
      return 'bg-red-500/90 text-white border-red-600'
    }
    if (towerColor === 'yellow') {
      return 'bg-yellow-500/90 text-black border-yellow-600'
    }
    // Par défaut, bleu
    return 'bg-blue-500/90 text-white border-blue-600'
  }

  const fetchDefenses = async () => {
    try {
      const parsed = JSON.parse(tower.defenseIds || '[]')
      let defenseIdsArray: string[] = []
      let assignmentsArray: Array<{ defenseId: string, userId: string }> = []
      
      // Gérer l'ancien format (array de strings) et le nouveau format (array d'objets)
      if (Array.isArray(parsed)) {
        if (parsed.length > 0 && typeof parsed[0] === 'string') {
          // Ancien format
          defenseIdsArray = parsed
          assignmentsArray = parsed.map((id: string) => ({ defenseId: id, userId: '' }))
        } else {
          // Nouveau format: extraire les defenseIds et assignments
          defenseIdsArray = parsed.map((item: any) => item?.defenseId).filter(Boolean)
          assignmentsArray = parsed.filter((item: any) => item && item.defenseId)
        }
      }
      
      setAssignments(assignmentsArray)
      
      if (defenseIdsArray.length === 0) {
        setDefenses([])
        return
      }

      const promises = defenseIdsArray.map(async (id: string) => {
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
      setDefenses([])
    }
  }

  const fetchUserNames = async () => {
    const userIds = assignments.map(a => a.userId).filter(Boolean)
    if (userIds.length === 0) {
      setUserNames({})
      return
    }

    try {
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
  }

  const fetchMonsterImages = async () => {
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
  }

  const getDefenseIdsArray = () => {
    try {
      const parsed = JSON.parse(tower.defenseIds || '[]')
      if (Array.isArray(parsed)) {
        if (parsed.length > 0 && typeof parsed[0] === 'string') {
          return parsed
        } else {
          return parsed.map((item: any) => item?.defenseId).filter(Boolean)
        }
      }
      return []
    } catch {
      return []
    }
  }

  const defenseIdsArray = getDefenseIdsArray()
  const hasDefenses = defenseIdsArray.length > 0

  useEffect(() => {
    const ids = getDefenseIdsArray()
    if (ids.length > 0) {
      fetchDefenses()
    } else {
      setDefenses([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tower.defenseIds])

  useEffect(() => {
    if (defenses.length > 0) {
      fetchMonsterImages()
      setFailedImages(new Set())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defenses])

  useEffect(() => {
    if (assignments.length > 0) {
      fetchUserNames()
    } else {
      setUserNames({})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignments])

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

  // Calculer la taille des icônes en fonction de la hauteur de la tour (pour éviter la dépendance circulaire)
  // Utiliser la hauteur de la tour pour calculer la taille des icônes
  const towerHeight = tower.height || currentSize.height
  const iconSize = Math.max(24, Math.min(48, towerHeight / 6))
  const iconSizePx = `${iconSize}px`
  
  // Calculer la largeur exacte basée sur la taille des icônes (3 icônes côte à côte + bordure)
  // 3 icônes + bordure de 2px de chaque côté (4px total)
  const exactWidth = iconSize * 3 + 4

  const renderMonsterIcon = (monsterName: string, fallbackText: string) => {
    const imageUrl = monsterImages[monsterName]
    const hasFailed = failedImages.has(monsterName)
    
    return (
      <div 
        className="bg-slate-700 flex items-center justify-center overflow-hidden relative flex-shrink-0"
        style={{ width: iconSizePx, height: iconSizePx, margin: 0 }}
      >
        {imageUrl && !hasFailed ? (
          <img
            src={imageUrl}
            alt={monsterName || fallbackText}
            className="w-full h-full object-cover"
            style={{ display: 'block' }}
            onError={(e) => handleImageError(e, monsterName)}
          />
        ) : (
          <span className="text-xs text-center text-white px-1" style={{ fontSize: `${iconSize * 0.25}px` }}>{monsterName || fallbackText}</span>
        )}
      </div>
    )
  }

  const content = (
    <div
      className={`relative ${getTowerColor()} border-2 rounded-lg overflow-hidden ${
        isEditing ? 'cursor-move' : ''
      } ${isDragging || isResizing ? 'opacity-75' : ''}`}
      style={{
        width: `${exactWidth}px`,
        height: '100%',
        minHeight: '100px',
      }}
    >
      <div className="relative w-full">
        <div className={`flex items-center justify-between py-1 rounded ${getBarColor()} w-full relative`}>
          <span className="text-white font-bold text-sm pl-2">{tower.towerNumber}</span>
          <span className="text-yellow-400 text-xs absolute left-1/2 transform -translate-x-1/2">
            {tower.stars === 4 ? '4' : '5'} ⭐
          </span>
        </div>
      </div>
      
      {/* Afficher chaque défense sur une ligne séparée */}
      <div className="flex flex-col" style={{ marginLeft: '-2px', marginRight: '-4px', marginTop: '-2px' }}>
        {showNames ? (
          // Afficher les pseudos des propriétaires groupés par défense avec cadres
          (() => {
            // Filtrer les assignments pour exclure ceux déjà assignés ailleurs
            const filteredAssignments = assignments.filter(assignment => {
              if (!assignment.userId) return true
              
              // Vérifier si cette défense avec cet utilisateur est déjà assignée dans une autre tour
              const isAlreadyAssignedElsewhere = allTowers.some(t => {
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
              return (
                <div 
                  key={defenseId} 
                  className="text-center py-1 px-1 flex flex-col gap-0.5"
                  style={{ fontSize: `${iconSize * 0.3}px`, lineHeight: `${iconSize * 0.4}px` }}
                >
                  {users.map((userName, idx) => (
                    <span 
                      key={`${defenseId}-${userName}-${idx}`}
                      className={`${getPseudoBgColor()} px-2 py-1 rounded font-bold whitespace-nowrap overflow-hidden text-ellipsis block border`}
                      style={{ fontSize: `${Math.max(iconSize * 0.35, 12)}px` }}
                    >
                      {userName}
                    </span>
                  ))}
                </div>
              )
            })
          })()
        ) : (
          // Afficher les icônes
          defenses.slice(0, 5).map((defense, defenseIndex) => (
          <div key={`${defense.id || defenseIndex}-${defenseIndex}`} className="flex" style={{ marginLeft: '-2px', marginRight: '-4px', gap: 0 }}>
            {renderMonsterIcon(defense.leaderMonster, 'L')}
            {renderMonsterIcon(defense.monster2, 'M2')}
            {renderMonsterIcon(defense.monster3, 'M3')}
          </div>
          ))
        )}
        {defenses.length === 0 && !showNames && (
          <div 
            className="bg-slate-700/50 border-2 border-dashed border-slate-600 rounded-lg flex items-center justify-center flex-shrink-0 mx-auto"
            style={{ width: iconSizePx, height: iconSizePx }}
          >
            <span className="text-gray-500 text-xs" style={{ fontSize: `${iconSize * 0.25}px` }}>+</span>
          </div>
        )}
      </div>
    </div>
  )

  if (!isEditing) {
    return (
      <div
        style={{
          position: 'absolute',
          left: tower.x,
          top: tower.y,
          width: `${exactWidth}px`,
          height: tower.height,
          pointerEvents: 'none',
        }}
      >
        {content}
      </div>
    )
  }

  return (
    <Draggable
      nodeRef={nodeRef}
      position={{ x: tower.x, y: tower.y }}
      onDrag={handleDrag}
      onStop={handleDragStop}
      disabled={!isEditing || isResizing}
      handle=".tower-handle"
    >
      <div 
        ref={nodeRef} 
        style={{ 
          position: 'absolute', 
          zIndex: 10,
          width: `${exactWidth}px`,
          height: tower.height,
          minWidth: `${exactWidth}px`,
        }}
      >
        <div className="tower-handle" style={{ width: '100%', height: '100%', position: 'relative' }}>
          {content}
          {isEditing && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onConfig(tower)
                }}
                className="absolute left-1/2 transform -translate-x-1/2 w-8 h-8 bg-blue-600 hover:bg-blue-700 rounded flex items-center justify-center text-white transition-colors flex-shrink-0 z-10"
                style={{ top: '-36px' }}
                title="Configurer la tour"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              <div
                ref={resizeHandleRef}
                onMouseDown={handleResizeStart}
                className="absolute bottom-0 right-0 w-5 h-5 bg-blue-600 border-2 border-blue-400 rounded cursor-se-resize z-50 flex items-center justify-center"
                style={{
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
                  position: 'absolute',
                  bottom: '0',
                  right: '0',
                }}
                title="Redimensionner"
              >
                <div className="w-0 h-0 border-l-4 border-l-transparent border-b-4 border-b-white" style={{ marginBottom: '2px', marginRight: '2px' }} />
              </div>
            </>
          )}
        </div>
      </div>
    </Draggable>
  )
}

