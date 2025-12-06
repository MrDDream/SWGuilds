'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { Defense } from '@/types/defense'
import { Button } from '@/components/ui/Button'
import { getMonstersFromCache, preloadMonsterImages } from '@/lib/monster-cache'
import { useUserPermissions } from '@/hooks/useUserPermissions'
import { useI18n } from '@/lib/i18n-provider'
import { getMonsterDisplayName } from '@/lib/monster-utils'

interface EligibleUser {
  id: string
  name: string | null
  identifier: string
}

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

export default function GestionPage() {
  const { data: session } = useSession()
  const { canEditAssignments } = useUserPermissions()
  const { t } = useI18n()
  const isAdmin = canEditAssignments()
  const currentUserId = session?.user?.id

  const [defenses, setDefenses] = useState<Defense[]>([])
  const [selectedDefenseId, setSelectedDefenseId] = useState<string>('')
  const [defenseFilter, setDefenseFilter] = useState<string>('')
  const [eligibleUsers, setEligibleUsers] = useState<EligibleUser[]>([])
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set())
  const [loadingDefenses, setLoadingDefenses] = useState(true)
  const [checkingUsers, setCheckingUsers] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loadingAssignments, setLoadingAssignments] = useState(true)
  const [monsterImages, setMonsterImages] = useState<Record<string, string>>({})
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())
  const [showMyAssignments, setShowMyAssignments] = useState(false)
  const [showAssignForm, setShowAssignForm] = useState(false)
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null)
  const [editingUserIds, setEditingUserIds] = useState<Set<string>>(new Set())
  const [editingEligibleUsers, setEditingEligibleUsers] = useState<EligibleUser[]>([])
  const [savingAssignment, setSavingAssignment] = useState(false)

  // Charger les défenses
  useEffect(() => {
    fetch('/api/defenses')
      .then(res => res.json())
      .then(data => {
        setDefenses(data)
        setLoadingDefenses(false)
      })
      .catch(err => {
        console.error('Erreur lors du chargement des défenses:', err)
        setLoadingDefenses(false)
      })
  }, [])

  // Charger les affectations existantes
  const loadAssignments = () => {
    fetch('/api/gestion/assignments')
      .then(res => res.json())
      .then(data => {
        setAssignments(data.assignments || [])
        setLoadingAssignments(false)
      })
      .catch(err => {
        console.error('Erreur lors du chargement des affectations:', err)
        setLoadingAssignments(false)
      })
  }

  useEffect(() => {
    loadAssignments()
  }, [])

  // Filtrer les défenses selon le filtre de recherche - ne retourner que les défenses filtrées
  const filteredDefenses = useMemo(() => {
    if (!defenseFilter.trim()) return []
    const filterLower = defenseFilter.toLowerCase()
    return defenses.filter(defense => {
      // Rechercher dans les noms d'affichage (sans les IDs)
      const leaderName = getMonsterDisplayName(defense.leaderMonster).toLowerCase()
      const monster2Name = getMonsterDisplayName(defense.monster2).toLowerCase()
      const monster3Name = getMonsterDisplayName(defense.monster3).toLowerCase()
      return leaderName.includes(filterLower) || monster2Name.includes(filterLower) || monster3Name.includes(filterLower)
    })
  }, [defenses, defenseFilter])

  // Filtrer les affectations selon "Mes affectations"
  const displayedAssignments = useMemo(() => {
    if (!showMyAssignments || !currentUserId) return assignments
    return assignments.filter(assignment => 
      assignment.users.some(user => user.id === currentUserId)
    )
  }, [assignments, showMyAssignments, currentUserId])

  // Charger les images des monstres pour les affectations et la défense sélectionnée
  useEffect(() => {
    const loadMonsterImages = async () => {
      const allMonsterNames = new Set<string>()
      
      // Ajouter les monstres des affectations
      assignments.forEach(assignment => {
        allMonsterNames.add(assignment.defense.leaderMonster)
        allMonsterNames.add(assignment.defense.monster2)
        allMonsterNames.add(assignment.defense.monster3)
      })
      
      // Ajouter les monstres de la défense sélectionnée
      const selectedDefense = defenses.find(d => d.id === selectedDefenseId)
      if (selectedDefense) {
        allMonsterNames.add(selectedDefense.leaderMonster)
        allMonsterNames.add(selectedDefense.monster2)
        allMonsterNames.add(selectedDefense.monster3)
      }
      
      // Ajouter les monstres des défenses filtrées pour le sélecteur
      filteredDefenses.forEach(defense => {
        allMonsterNames.add(defense.leaderMonster)
        allMonsterNames.add(defense.monster2)
        allMonsterNames.add(defense.monster3)
      })
      
      if (allMonsterNames.size > 0) {
        await getMonstersFromCache()
        const images = await preloadMonsterImages(Array.from(allMonsterNames))
        setMonsterImages(prev => ({ ...prev, ...images }))
      }
    }
    
    loadMonsterImages()
  }, [assignments, selectedDefenseId, defenses, filteredDefenses])

  const handleCheckUsers = async () => {
    if (!selectedDefenseId) {
      alert('Veuillez sélectionner une défense')
      return
    }

    setCheckingUsers(true)
    setEligibleUsers([])
    setSelectedUserIds(new Set())

    try {
      const response = await fetch(`/api/gestion/check-users?defenseId=${selectedDefenseId}`)
      const data = await response.json()
      
      if (data.error) {
        alert(data.error)
      } else {
        setEligibleUsers(data.users || [])
      }
    } catch (error) {
      console.error('Erreur lors de la vérification des utilisateurs:', error)
      alert('Erreur lors de la vérification des utilisateurs')
    } finally {
      setCheckingUsers(false)
    }
  }

  const handleAssign = async () => {
    if (!selectedDefenseId || selectedUserIds.size === 0) {
      alert(t('gestion.selectDefenseAndUsers'))
      return
    }

    setAssigning(true)

    try {
      const response = await fetch('/api/gestion/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          defenseId: selectedDefenseId,
          userIds: Array.from(selectedUserIds),
        }),
      })

      const data = await response.json()

      if (data.error) {
        alert(data.error)
      } else {
        alert(t('gestion.defenseAssigned', { count: data.count }))
        loadAssignments()
        // Réinitialiser
        setSelectedDefenseId('')
        setDefenseFilter('')
        setEligibleUsers([])
        setSelectedUserIds(new Set())
      }
    } catch (error) {
      console.error('Erreur lors de l\'affectation:', error)
      alert(t('gestion.assignError'))
    } finally {
      setAssigning(false)
    }
  }

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!confirm(t('gestion.deleteAssignment'))) {
      return
    }

    try {
      const response = await fetch(`/api/gestion/assignments/${assignmentId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (data.error) {
        alert(data.error)
      } else {
        alert(t('gestion.assignmentDeleted'))
        loadAssignments()
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error)
      alert(t('gestion.deleteError'))
    }
  }

  const handleStartEdit = async (assignment: Assignment) => {
    setEditingAssignmentId(assignment.defenseId)
    setEditingUserIds(new Set(assignment.users.map(u => u.id)))
    
    // Charger les utilisateurs éligibles pour cette défense
    try {
      const response = await fetch(`/api/gestion/check-users?defenseId=${assignment.defenseId}`)
      const data = await response.json()
      // Les utilisateurs sont déjà triés par l'API
      
      if (data.error) {
        alert(data.error)
      } else {
        setEditingEligibleUsers(data.users || [])
      }
    } catch (error) {
      console.error('Erreur lors de la vérification des utilisateurs:', error)
      alert('Erreur lors de la vérification des utilisateurs')
    }
  }

  const handleCancelEdit = () => {
    setEditingAssignmentId(null)
    setEditingUserIds(new Set())
    setEditingEligibleUsers([])
  }

  const handleSaveEdit = async (defenseId: string) => {
    setSavingAssignment(true)

    try {
      const response = await fetch(`/api/gestion/assignments/defense/${defenseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userIds: Array.from(editingUserIds),
        }),
      })

      const data = await response.json()

      if (data.error) {
        alert(data.error)
      } else {
        alert(t('gestion.assignmentModified'))
        loadAssignments()
        handleCancelEdit()
      }
    } catch (error) {
      console.error('Erreur lors de la modification:', error)
      alert(t('gestion.modifyError'))
    } finally {
      setSavingAssignment(false)
    }
  }

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(userId)) {
        newSet.delete(userId)
      } else {
        newSet.add(userId)
      }
      return newSet
    })
  }

  const toggleEditingUserSelection = (userId: string) => {
    setEditingUserIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(userId)) {
        newSet.delete(userId)
      } else {
        newSet.add(userId)
      }
      return newSet
    })
  }

  const toggleSelectAll = () => {
    if (selectedUserIds.size === eligibleUsers.length) {
      setSelectedUserIds(new Set())
    } else {
      setSelectedUserIds(new Set(eligibleUsers.map(u => u.id)))
    }
  }

  const toggleEditingSelectAll = () => {
    if (editingUserIds.size === editingEligibleUsers.length) {
      setEditingUserIds(new Set())
    } else {
      setEditingUserIds(new Set(editingEligibleUsers.map(u => u.id)))
    }
  }

  const renderMonsterIcon = (monsterName: string, size: 'small' | 'medium' | 'large' = 'medium') => {
    const imageKey = monsterName
    const imageUrl = monsterImages[imageKey]
    const hasFailed = failedImages.has(imageKey)
    const sizeClass = size === 'small' ? 'w-8 h-8' : size === 'large' ? 'w-16 h-16' : 'w-12 h-12'

    return (
      <div className={`${sizeClass} bg-slate-700 rounded flex items-center justify-center overflow-hidden relative border border-slate-600 flex-shrink-0`}>
        {imageUrl && !hasFailed ? (
          <img
            src={imageUrl}
            alt={monsterName}
            className="w-full h-full object-cover"
            onError={(e) => {
              setFailedImages(prev => new Set(prev).add(imageKey))
              e.currentTarget.style.display = 'none'
            }}
          />
        ) : (
          <span className={`text-center text-white px-1 ${size === 'small' ? 'text-[10px]' : size === 'large' ? 'text-xs' : 'text-[10px]'}`}>
            {monsterName}
          </span>
        )}
      </div>
    )
  }

  const selectedDefense = defenses.find(d => d.id === selectedDefenseId)

  return (
    <div className="w-full mt-8 px-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white">{t('gestion.title')}</h1>
        {isAdmin && (
          <Button
            type="button"
            variant={showAssignForm ? 'secondary' : 'primary'}
            onClick={() => {
              setShowAssignForm(!showAssignForm)
              if (showAssignForm) {
                setSelectedDefenseId('')
                setDefenseFilter('')
                setEligibleUsers([])
                setSelectedUserIds(new Set())
              }
            }}
          >
            {showAssignForm ? t('common.cancel') : t('gestion.assignDefenses')}
          </Button>
        )}
      </div>

      {/* Section de sélection et affectation - Admin uniquement */}
      {isAdmin && showAssignForm && (
        <div className="bg-slate-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">{t('gestion.assignDefense')}</h2>

          {/* Sélecteur de défense avec filtre */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {t('gestion.searchDefense')}
            </label>
            <input
              type="text"
              value={defenseFilter}
              onChange={(e) => setDefenseFilter(e.target.value)}
              placeholder={t('gestion.searchPlaceholder')}
              className="w-full md:w-96 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
            />
            {loadingDefenses ? (
              <div className="text-gray-400">{t('gestion.loadingDefenses')}</div>
            ) : (
              defenseFilter.trim() && (
                <div className="bg-slate-700 rounded-lg border border-slate-600 max-h-64 overflow-y-auto">
                  {filteredDefenses.length === 0 ? (
                    <div className="p-4 text-gray-400 text-center">{t('gestion.noDefensesFound')}</div>
                  ) : (
                    <div className="divide-y divide-slate-600">
                      {filteredDefenses.map(defense => (
                        <button
                          key={defense.id}
                          type="button"
                          onClick={() => {
                            setSelectedDefenseId(defense.id)
                            setEligibleUsers([])
                            setSelectedUserIds(new Set())
                          }}
                          className={`w-full p-3 flex items-center gap-3 hover:bg-slate-600 transition-colors ${
                            selectedDefenseId === defense.id ? 'bg-slate-600' : ''
                          }`}
                        >
                          <div className="flex gap-0.5">
                            {renderMonsterIcon(defense.leaderMonster, 'small')}
                            {renderMonsterIcon(defense.monster2, 'small')}
                            {renderMonsterIcon(defense.monster3, 'small')}
                          </div>
                          <div className="text-left flex-1">
                            <div className="text-white text-sm">
                              {getMonsterDisplayName(defense.leaderMonster)} / {getMonsterDisplayName(defense.monster2)} / {getMonsterDisplayName(defense.monster3)}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            )}
          </div>

          {/* Bouton vérifier les membres */}
          {selectedDefenseId && (
            <div className="mb-4">
              <Button
                type="button"
                variant="primary"
                onClick={handleCheckUsers}
                disabled={checkingUsers}
              >
                {checkingUsers ? t('gestion.checking') : t('gestion.checkMembers')}
              </Button>
            </div>
          )}

          {/* Liste des utilisateurs éligibles */}
          {eligibleUsers.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-white">
                  {t('gestion.eligibleMembers')} ({eligibleUsers.length})
                </h3>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={toggleSelectAll}
                  className="text-sm"
                >
                  {selectedUserIds.size === eligibleUsers.length ? t('common.deselectAll') : t('common.selectAll')}
                </Button>
              </div>
              <div className="bg-slate-700 rounded-lg p-4 max-h-96 overflow-y-auto">
                <div className="space-y-2">
                  {eligibleUsers.map(user => (
                    <label
                      key={user.id}
                      className="flex items-center gap-3 p-2 rounded hover:bg-slate-600 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedUserIds.has(user.id)}
                        onChange={() => toggleUserSelection(user.id)}
                        className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-white">
                        {user.name || user.identifier}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Bouton affecter */}
          {eligibleUsers.length > 0 && (
            <div>
              <Button
                type="button"
                variant="primary"
                onClick={handleAssign}
                disabled={selectedUserIds.size === 0 || assigning}
              >
                {assigning ? t('gestion.assigning') : t('gestion.assign') + ` (${selectedUserIds.size} ${selectedUserIds.size > 1 ? t('gestion.membersPlural') : t('gestion.members')})`}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Section des affectations existantes */}
      <div className="bg-slate-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">{t('gestion.existingAssignments')}</h2>
          {currentUserId && (
            <Button
              type="button"
              variant={showMyAssignments ? 'primary' : 'secondary'}
              onClick={() => setShowMyAssignments(!showMyAssignments)}
            >
              {showMyAssignments ? t('gestion.allAssignments') : t('gestion.myAssignments')}
            </Button>
          )}
        </div>

        {loadingAssignments ? (
          <div className="text-gray-400">{t('gestion.loadingAssignments')}</div>
        ) : displayedAssignments.length === 0 ? (
          <div className="text-gray-400 text-center py-8">
            {showMyAssignments ? t('gestion.noMyAssignments') : t('gestion.noAssignments')}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {displayedAssignments.map(assignment => {
              const isEditing = editingAssignmentId === assignment.defenseId
              
              return (
                <div
                  key={assignment.defenseId}
                  className="bg-slate-700 rounded-lg p-4 border border-slate-600"
                  style={{ minHeight: '200px' }}
                >
                  {/* Icônes des monstres en haut - taille doublée */}
                  <div className="flex justify-center gap-0.5 mb-3">
                    {renderMonsterIcon(assignment.defense.leaderMonster, 'large')}
                    {renderMonsterIcon(assignment.defense.monster2, 'large')}
                    {renderMonsterIcon(assignment.defense.monster3, 'large')}
                  </div>

                  {isEditing ? (
                    /* Mode édition */
                    <div className="space-y-3">
                      <div className="text-xs text-gray-400 mb-2 text-center">
                        {t('gestion.modifyMembers')}
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={toggleEditingSelectAll}
                          className="text-xs px-2 py-1"
                        >
                          {editingUserIds.size === editingEligibleUsers.length ? t('common.deselectAll') : t('common.selectAll')}
                        </Button>
                      </div>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {editingEligibleUsers.map(user => (
                          <label
                            key={user.id}
                            className="flex items-center gap-2 p-1 rounded hover:bg-slate-600 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={editingUserIds.has(user.id)}
                              onChange={() => toggleEditingUserSelection(user.id)}
                              className="w-3 h-3 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500"
                            />
                            <span className="text-white text-xs flex-1">
                              {user.name || user.identifier}
                            </span>
                          </label>
                        ))}
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Button
                          type="button"
                          variant="primary"
                          onClick={() => handleSaveEdit(assignment.defenseId)}
                          disabled={savingAssignment}
                          className="text-xs px-2 py-1 flex-1"
                        >
                          {savingAssignment ? '...' : t('gestion.save')}
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={handleCancelEdit}
                          className="text-xs px-2 py-1 flex-1"
                        >
                          {t('common.cancel')}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* Mode affichage */
                    <div className="space-y-1">
                      <div className="text-xs text-gray-400 mb-2 text-center">
                        {assignment.users.length} {assignment.users.length > 1 ? t('gestion.membersPlural') : t('gestion.members')}
                      </div>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {assignment.users.map(user => (
                          <div
                            key={user.id}
                            className="bg-slate-800 px-2 py-1 rounded text-white text-xs flex items-center justify-between"
                          >
                            <span className="flex-1 truncate">{user.name || user.identifier}</span>
                            {isAdmin && showAssignForm && (
                              <button
                                onClick={() => handleDeleteAssignment(user.assignmentId)}
                                className="text-red-400 hover:text-red-300 ml-1 flex-shrink-0"
                                title={t('gestion.deleteAssignment')}
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      {isAdmin && showAssignForm && (
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => handleStartEdit(assignment)}
                          className="w-full text-xs px-2 py-1 mt-2"
                        >
                          {t('gestion.modify')}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
