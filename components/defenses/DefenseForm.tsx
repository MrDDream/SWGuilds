'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Defense, Counter } from '@/types/defense'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Toggle } from '@/components/ui/Toggle'
import { Button } from '@/components/ui/Button'
import { MonsterSelector } from '@/components/ui/MonsterSelector'
import { ListInput } from '@/components/ui/ListInput'
import { VoteButtons } from '@/components/ui/VoteButtons'
import { getMonstersFromCache, preloadMonsterImages, getAllMonsterImages } from '@/lib/monster-cache'
import { useUserPermissions } from '@/hooks/useUserPermissions'
import { getMonsterDisplayName } from '@/lib/monster-utils'
import { useI18n } from '@/lib/i18n-provider'

interface DefenseFormProps {
  defense?: Defense
  isNew?: boolean
  onCancel?: () => void
  onSave?: (defense: Defense) => void
  initialTab?: 'apercu' | 'contres'
  allowAddCounterOnly?: boolean // Si true, permet seulement d'ajouter des contres, pas de modifier la défense
  initialEditingCounterId?: string // ID du contre à éditer au chargement
}

type Tab = 'apercu' | 'contres'

export function DefenseForm({ defense, isNew = false, onCancel, onSave, initialTab = 'apercu', allowAddCounterOnly = false, initialEditingCounterId }: DefenseFormProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const { canEditDefense: canEditDefensePermission, permissions } = useUserPermissions()
  const { t, locale } = useI18n()
  const [activeTab, setActiveTab] = useState<Tab>(initialTab)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // Vérifier si l'utilisateur peut modifier les contres (propriétaire de la défense, admin ou avec permission canEditAllDefenses)
  const canEditCounters = isNew || !defense || (session?.user?.id ? canEditDefensePermission(defense.userId, session.user.id) : false)
  
  // Si allowAddCounterOnly est true, on force l'onglet contres et on désactive les autres onglets
  useEffect(() => {
    if (allowAddCounterOnly) {
      setActiveTab('contres')
    }
  }, [allowAddCounterOnly])

  // Si initialEditingCounterId est fourni, démarrer l'édition du contre au chargement
  useEffect(() => {
    if (initialEditingCounterId && defense) {
      const counter = defense.counters?.find(c => c.id === initialEditingCounterId)
      if (counter) {
        setActiveTab('contres')
        handleStartEditCounter(counter)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialEditingCounterId])

  // Form data
  const [leaderMonster, setLeaderMonster] = useState(defense?.leaderMonster || '')
  const [monster2, setMonster2] = useState(defense?.monster2 || '')
  const [monster3, setMonster3] = useState(defense?.monster3 || '')
  const [monsterImages, setMonsterImages] = useState<Record<string, string>>({})
  const [strengths, setStrengths] = useState(defense?.strengths || '')
  const [weaknesses, setWeaknesses] = useState(defense?.weaknesses || '')
  const [notes, setNotes] = useState(defense?.notes || '')
  // Tout est public par défaut, plus d'option épinglée
  const isPublic = true
  const [tags, setTags] = useState<any[]>([])
  const [selectedTagId, setSelectedTagId] = useState<string | null>(
    defense?.tags && defense.tags.length > 0 ? defense.tags[0].tag.id : null
  )

  // Counters
  const [counters, setCounters] = useState<Counter[]>(defense?.counters || [])
  const [newCounterLeader, setNewCounterLeader] = useState('')
  const [newCounterMonster2, setNewCounterMonster2] = useState('')
  const [newCounterMonster3, setNewCounterMonster3] = useState('')
  const [newCounterDescription, setNewCounterDescription] = useState('')
  const [editingCounterId, setEditingCounterId] = useState<string | null>(null)
  const [editCounterLeader, setEditCounterLeader] = useState('')
  const [editCounterMonster2, setEditCounterMonster2] = useState('')
  const [editCounterMonster3, setEditCounterMonster3] = useState('')
  const [editCounterDescription, setEditCounterDescription] = useState('')

  const fetchTags = async () => {
    try {
      const response = await fetch('/api/tags')
      if (response.ok) {
        const data = await response.json()
        setTags(data)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des tags:', error)
    }
  }

  const fetchMonsterImages = useCallback(async () => {
    const monstersToFetch = [leaderMonster, monster2, monster3].filter(Boolean)
    if (monstersToFetch.length === 0) return

    // Charger depuis le cache
    await getMonstersFromCache()
    const images = await preloadMonsterImages(monstersToFetch)
    // Utiliser directement les images de preloadMonsterImages (qui sont toujours Swarfarm)
    setMonsterImages(prev => ({ ...prev, ...images }))
  }, [leaderMonster, monster2, monster3])

  useEffect(() => {
    fetchMonsterImages()
    fetchTags()
  }, [fetchMonsterImages])

  useEffect(() => {
    // Mettre à jour les images quand les monstres changent
    fetchMonsterImages()
  }, [fetchMonsterImages])


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!leaderMonster || !monster2 || !monster3) {
      setError(t('defenses.threeMonstersRequired'))
      setLoading(false)
      return
    }

    try {
      const url = isNew ? '/api/defenses' : `/api/defenses/${defense?.id}`
      const method = isNew ? 'POST' : 'PUT'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leaderMonster,
          monster2,
          monster3,
          strengths: strengths || null,
          weaknesses: weaknesses || null,
          attackSequence: null,
          notes: notes || null,
          pinnedToDashboard: false,
          isPublic: true,
          tagIds: selectedTagId ? [selectedTagId] : [],
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || 'Une erreur est survenue')
        setLoading(false)
        return
      }

      if (isNew) {
        router.push('/defenses')
        router.refresh()
      } else if (onCancel) {
        onCancel()
        router.refresh()
      } else {
        router.push('/defenses')
        router.refresh()
      }
    } catch (err) {
      setError('Une erreur est survenue')
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!defense || !confirm('Êtes-vous sûr de vouloir supprimer cette défense ?')) {
      return
    }

    try {
      const response = await fetch(`/api/defenses/${defense.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        router.push('/defenses')
        router.refresh()
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error)
    }
  }

  const handleAddCounter = async () => {
    if (!defense || !newCounterLeader || !newCounterMonster2 || !newCounterMonster3) {
      return
    }

    const counterMonsters = [newCounterLeader, newCounterMonster2, newCounterMonster3]

    try {
      const response = await fetch(`/api/defenses/${defense.id}/counters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          counterMonsters,
          description: newCounterDescription || null,
        }),
      })

      if (response.ok) {
        const newCounter = await response.json()
        setCounters([...counters, newCounter])
        setNewCounterLeader('')
        setNewCounterMonster2('')
        setNewCounterMonster3('')
        setNewCounterDescription('')
        
        // Si on est en mode "ajout de contre uniquement", on retourne en mode lecture après l'ajout
        if (allowAddCounterOnly && onCancel) {
          setTimeout(() => {
            onCancel()
          }, 500) // Petit délai pour que l'utilisateur voie le contre ajouté
        }
      }
    } catch (error) {
      console.error(t('defenses.addCounterError'), error)
    }
  }


  const handleDeleteCounter = async (counterId: string) => {
    if (!confirm(t('defenses.deleteConfirm'))) return

    try {
      const response = await fetch(`/api/counters/${counterId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setCounters(counters.filter(c => c.id !== counterId))
      }
    } catch (error) {
      console.error(t('defenses.deleteCounterError'), error)
    }
  }

  const handleStartEditCounter = (counter: Counter) => {
    const monsters = JSON.parse(counter.counterMonsters)
    setEditingCounterId(counter.id)
    setEditCounterLeader(monsters[0] || '')
    setEditCounterMonster2(monsters[1] || '')
    setEditCounterMonster3(monsters[2] || '')
    setEditCounterDescription(counter.description || '')
  }

  const handleCancelEditCounter = () => {
    setEditingCounterId(null)
    setEditCounterLeader('')
    setEditCounterMonster2('')
    setEditCounterMonster3('')
    setEditCounterDescription('')
  }

  const handleUpdateCounter = async (counterId: string) => {
    if (!editCounterLeader || !editCounterMonster2 || !editCounterMonster3) {
      return
    }

    const counterMonsters = [editCounterLeader, editCounterMonster2, editCounterMonster3]

    try {
      const response = await fetch(`/api/counters/${counterId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          counterMonsters,
          description: editCounterDescription || null,
        }),
      })

      if (response.ok) {
        const updatedCounter = await response.json()
        // S'assurer que le contre mis à jour a les champs createdBy et updatedBy
        const counterWithFields = {
          ...updatedCounter,
          createdBy: updatedCounter.createdBy || counters.find(c => c.id === counterId)?.createdBy || '',
          updatedBy: updatedCounter.updatedBy || session?.user?.name || session?.user?.identifier || '',
        }
        setCounters(counters.map(c => c.id === counterId ? counterWithFields : c))
        handleCancelEditCounter()
      }
    } catch (error) {
      console.error(t('defenses.updateCounterError'), error)
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString(locale === 'en' ? 'en-US' : 'fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const tabs: { id: Tab; label: string }[] = allowAddCounterOnly 
    ? [{ id: 'contres', label: t('defenses.counters') }]
    : [
        { id: 'apercu', label: t('defenses.defense') },
        { id: 'contres', label: t('defenses.counters') },
      ]

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Tabs */}
      <div className="border-b border-slate-700">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Tab content */}
      <div className="min-h-[400px]">
        {activeTab === 'apercu' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-blue-400 mb-2">
                  {t('defenses.defense')}:
                </label>
                <div className="flex items-end gap-6">
                  <div className="w-16 h-16 bg-slate-700 rounded-lg flex items-center justify-center overflow-hidden">
                    {monsterImages[leaderMonster] ? (
                      <img
                        src={monsterImages[leaderMonster]}
                        alt={getMonsterDisplayName(leaderMonster) || t('defenses.leader')}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                          e.currentTarget.parentElement!.innerHTML = `<span class="text-xs text-center text-white">${t('defenses.leader')}</span>`
                        }}
                      />
                    ) : (
                      <span className="text-xs text-center text-white">{getMonsterDisplayName(leaderMonster) || t('defenses.leader')}</span>
                    )}
                  </div>
                  <div className="w-16 h-16 bg-slate-700 rounded-lg flex items-center justify-center overflow-hidden">
                    {monsterImages[monster2] ? (
                      <img
                        src={monsterImages[monster2]}
                        alt={getMonsterDisplayName(monster2) || 'Monstre 2'}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                          e.currentTarget.parentElement!.innerHTML = `<span class="text-xs text-center text-white">${t('defenses.monster2')}</span>`
                        }}
                      />
                    ) : (
                      <span className="text-xs text-center text-white">{getMonsterDisplayName(monster2) || t('defenses.monster2')}</span>
                    )}
                  </div>
                  <div className="w-16 h-16 bg-slate-700 rounded-lg flex items-center justify-center overflow-hidden">
                    {monsterImages[monster3] ? (
                      <img
                        src={monsterImages[monster3]}
                        alt={getMonsterDisplayName(monster3) || 'Monstre 3'}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                          e.currentTarget.parentElement!.innerHTML = `<span class="text-xs text-center text-white">${t('defenses.monster3')}</span>`
                        }}
                      />
                    ) : (
                      <span className="text-xs text-center text-white">{getMonsterDisplayName(monster3) || t('defenses.monster3')}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <MonsterSelector
              label={t('defenses.leaderMonster')}
              value={leaderMonster}
              onChange={setLeaderMonster}
              required
              placeholder={t('defenses.searchLeader')}
            />

            <MonsterSelector
              label={t('defenses.monster2')}
              value={monster2}
              onChange={setMonster2}
              required
              placeholder={t('defenses.searchMonsterPlaceholder')}
            />

            <MonsterSelector
              label={t('defenses.monster3')}
              value={monster3}
              onChange={setMonster3}
              required
              placeholder={t('defenses.searchMonsterPlaceholder')}
            />

            <Textarea
              label={t('defenses.notes')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('defenses.notes')}
              rows={4}
            />

            <div>
              <label className="block text-sm font-medium text-blue-400 mb-2">
                {t('defenses.tags')}
              </label>
              <select
                value={selectedTagId || ''}
                onChange={(e) => setSelectedTagId(e.target.value || null)}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{t('defenses.noTag')}</option>
                {tags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                  </option>
                ))}
              </select>
            </div>

            {defense && (
              <>
                <div className="text-sm text-gray-400">
                  <div>{t('defenses.addedBy')}: {defense.createdBy} {t('defenses.on')} {formatDate(defense.createdAt)}</div>
                  <div className="mt-1">
                    {t('defenses.lastUpdateBy')}: {defense.updatedBy} {t('defenses.on')} {formatDate(defense.updatedAt)}
                  </div>
                </div>
              </>
            )}

          </div>
        )}

        {activeTab === 'contres' && (
          <div className="space-y-6">
            {!isNew && (
              <>
                {/* Afficher le formulaire d'ajout seulement si on n'est pas en train d'éditer un contre */}
                {!editingCounterId && (
                  <div className="bg-slate-800 p-4 rounded-lg">
                    <h3 className="text-lg font-medium text-white mb-4">{t('defenses.addCounter')}</h3>
                    <div className="space-y-4">
                      <MonsterSelector
                        label={t('defenses.leaderMonster')}
                        value={newCounterLeader}
                        onChange={setNewCounterLeader}
                        required
                        placeholder={t('defenses.searchLeader')}
                      />

                      <MonsterSelector
                        label={t('defenses.monster2')}
                        value={newCounterMonster2}
                        onChange={setNewCounterMonster2}
                        required
                        placeholder={t('defenses.searchMonsterPlaceholder')}
                      />

                      <MonsterSelector
                        label={t('defenses.monster3')}
                        value={newCounterMonster3}
                        onChange={setNewCounterMonster3}
                        required
                        placeholder={t('defenses.searchMonsterPlaceholder')}
                      />

                      <Textarea
                        label={t('defenses.notes')}
                        value={newCounterDescription}
                        onChange={(e) => setNewCounterDescription(e.target.value)}
                        placeholder={t('defenses.notes')}
                        rows={3}
                      />
                      <Button 
                        type="button" 
                        onClick={handleAddCounter}
                        disabled={!newCounterLeader || !newCounterMonster2 || !newCounterMonster3}
                      >
                        {t('defenses.addCounter')}
                      </Button>
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-lg font-medium text-white mb-4">{t('defenses.counters')}</h3>
                  {counters.length === 0 ? (
                    <p className="text-gray-400">{t('defenses.noCounters')}</p>
                  ) : (
                    <div className="space-y-4">
                      {counters.map((counter) => {
                        const monsters = JSON.parse(counter.counterMonsters)
                        const [leader, monster2, monster3] = monsters
                        const isEditing = editingCounterId === counter.id
                        
                        return (
                          <div key={counter.id} className="bg-slate-800 p-4 rounded-lg border border-slate-700 relative">
                            {isEditing ? (
                              <div className="space-y-4">
                                <h4 className="text-sm font-medium text-blue-400 mb-2">{t('defenses.editCounter')}</h4>
                                <MonsterSelector
                                  label={t('defenses.leaderMonster')}
                                  value={editCounterLeader}
                                  onChange={setEditCounterLeader}
                                  required
                                  placeholder={t('defenses.searchLeader')}
                                />
                                <MonsterSelector
                                  label={t('defenses.monster2')}
                                  value={editCounterMonster2}
                                  onChange={setEditCounterMonster2}
                                  required
                                  placeholder={t('defenses.searchMonsterPlaceholder')}
                                />
                                <MonsterSelector
                                  label={t('defenses.monster3')}
                                  value={editCounterMonster3}
                                  onChange={setEditCounterMonster3}
                                  required
                                  placeholder={t('defenses.searchMonsterPlaceholder')}
                                />
                                <Textarea
                                  label={t('defenses.notes')}
                                  value={editCounterDescription}
                                  onChange={(e) => setEditCounterDescription(e.target.value)}
                                  placeholder={t('defenses.notes')}
                                  rows={3}
                                />
                                <div className="flex gap-2">
                                  <Button
                                    type="button"
                                    onClick={() => handleUpdateCounter(counter.id)}
                                    disabled={!editCounterLeader || !editCounterMonster2 || !editCounterMonster3}
                                  >
                                    {t('common.save')}
                                  </Button>
                                  <Button
                                    type="button"
                                    onClick={handleCancelEditCounter}
                                    variant="secondary"
                                  >
                                    {t('common.cancel')}
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div>
                                {/* Bouton d'édition en haut à droite */}
                                {(() => {
                                  // Vérifier si l'utilisateur peut modifier ce contre spécifique (seulement créateur ou admin)
                                  const userIdentifier = session?.user?.name || session?.user?.identifier || ''
                                  const isCounterCreator = counter.createdBy === userIdentifier || counter.createdBy === session?.user?.identifier || counter.createdBy === session?.user?.name
                                  const canEditAllDefenses = permissions?.role === 'admin' || permissions?.canEditAllDefenses === true
                                  const canEditThisCounter = isCounterCreator || canEditAllDefenses
                                  
                                  return canEditThisCounter && (
                                    <button
                                      type="button"
                                      onClick={() => handleStartEditCounter(counter)}
                                      className="absolute top-4 right-4 p-2 text-blue-400 hover:text-blue-300 hover:bg-slate-700 rounded-lg transition-colors"
                                      title={t('defenses.editCounterTitle')}
                                    >
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                      </svg>
                                    </button>
                                  )
                                })()}
                                <div className="flex justify-center gap-3 mb-3 flex-wrap">
                                  {(() => {
                                    const imageUrl1 = monsterImages[leader] || getAllMonsterImages()[leader]
                                    const imageUrl2 = monsterImages[monster2] || getAllMonsterImages()[monster2]
                                    const imageUrl3 = monsterImages[monster3] || getAllMonsterImages()[monster3]
                                    
                                    return (
                                      <>
                                        <div className="flex flex-col items-center min-w-[96px] flex-shrink-0">
                                          <div className="w-16 h-16 bg-slate-700 rounded-lg flex items-center justify-center overflow-hidden relative flex-shrink-0">
                                            {imageUrl1 ? (
                                              <img
                                                src={imageUrl1}
                                                alt={leader || 'Leader'}
                                                className="w-full h-full object-cover"
                                              />
                                            ) : (
                                              <span className="text-xs text-center text-white px-1">{leader || t('defenses.leader')}</span>
                                            )}
                                          </div>
                                          <span className="text-sm text-white mt-2.5 text-center whitespace-nowrap overflow-hidden text-ellipsis max-w-[96px]">{leader || t('defenses.leader')}</span>
                                        </div>
                                        <div className="flex flex-col items-center min-w-[96px] flex-shrink-0">
                                          <div className="w-16 h-16 bg-slate-700 rounded-lg flex items-center justify-center overflow-hidden relative flex-shrink-0">
                                            {imageUrl2 ? (
                                              <img
                                                src={imageUrl2}
                                                alt={monster2 || t('defenses.monster2')}
                                                className="w-full h-full object-cover"
                                              />
                                            ) : (
                                              <span className="text-xs text-center text-white px-1">{monster2 || t('defenses.monster2')}</span>
                                            )}
                                          </div>
                                          <span className="text-sm text-white mt-2.5 text-center whitespace-nowrap overflow-hidden text-ellipsis max-w-[96px]">{getMonsterDisplayName(monster2) || t('defenses.monster2')}</span>
                                        </div>
                                        <div className="flex flex-col items-center min-w-[96px] flex-shrink-0">
                                          <div className="w-16 h-16 bg-slate-700 rounded-lg flex items-center justify-center overflow-hidden relative flex-shrink-0">
                                            {imageUrl3 ? (
                                              <img
                                                src={imageUrl3}
                                                alt={monster3 || t('defenses.monster3')}
                                                className="w-full h-full object-cover"
                                              />
                                            ) : (
                                              <span className="text-xs text-center text-white px-1">{getMonsterDisplayName(monster3) || t('defenses.monster3')}</span>
                                            )}
                                          </div>
                                          <span className="text-sm text-white mt-2.5 text-center whitespace-nowrap overflow-hidden text-ellipsis max-w-[96px]">{getMonsterDisplayName(monster3) || t('defenses.monster3')}</span>
                                        </div>
                                      </>
                                    )
                                  })()}
                                </div>
                                {counter.description && (
                                  <p className="text-gray-400 text-sm mt-2">{counter.description}</p>
                                )}
                                <div className="mt-3 flex items-center justify-between">
                                  <div className="text-xs text-gray-500">
                                    <div>{t('defenses.addedBy')}: {counter.createdBy || t('common.no')}</div>
                                    <div className="mt-1">
                                      {t('defenses.lastUpdateBy')}: {counter.updatedBy || t('common.no')} {t('defenses.on')} {formatDate(counter.updatedAt)}
                                    </div>
                                  </div>
                                  <VoteButtons entityId={counter.id} entityType="counter" />
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
            {isNew && (
              <p className="text-gray-400">
                {t('defenses.saveDefenseFirst')}
              </p>
            )}
          </div>
        )}

      </div>

      {/* Action buttons */}
      {!allowAddCounterOnly && (
        <div className="flex justify-between items-center pt-6 border-t border-slate-700">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              if (onCancel) {
                onCancel()
              } else {
                router.back()
              }
            }}
          >
            {onCancel ? t('common.cancel') : t('common.back')}
          </Button>
          <div className="flex gap-4">
            <Button
              type="submit"
              variant="success"
              disabled={loading}
            >
              {loading ? t('common.saving') : t('common.save')}
            </Button>
            {!isNew && defense && (
              <Button
                type="button"
                variant="danger"
                onClick={handleDelete}
              >
                {t('common.delete')}
              </Button>
            )}
          </div>
        </div>
      )}
      {allowAddCounterOnly && (
        <div className="flex justify-end pt-6 border-t border-slate-700">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              if (onCancel) {
                onCancel()
              } else {
                router.back()
              }
            }}
          >
            {t('common.close')}
          </Button>
        </div>
      )}
    </form>
  )
}

