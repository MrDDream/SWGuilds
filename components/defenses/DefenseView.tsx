'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Defense, Counter } from '@/types/defense'
import { Button } from '@/components/ui/Button'
import { VoteButtons } from '@/components/ui/VoteButtons'
import { getMonstersFromCache, preloadMonsterImages, getAllMonsterImages } from '@/lib/monster-cache'
import { useUserPermissions } from '@/hooks/useUserPermissions'
import { useI18n } from '@/lib/i18n-provider'

interface DefenseViewProps {
  defense: Defense
  onEdit?: (tab?: 'apercu' | 'contres', counterId?: string) => void
  canEditDefense?: boolean // Indique si l'utilisateur peut modifier la défense (pas seulement ajouter des contres)
}

interface Monster {
  id: number
  name: string
  image_filename: string
}

export function DefenseView({ defense, onEdit, canEditDefense = false }: DefenseViewProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const { canEditDefense: canEditDefensePermission, permissions } = useUserPermissions()
  const { t, locale } = useI18n()
  const [monsterImages, setMonsterImages] = useState<Record<string, string>>({})
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<'apercu' | 'contres'>('apercu')
  const [counters, setCounters] = useState<Counter[]>(defense?.counters || [])
  const [loadingCounters, setLoadingCounters] = useState(false)
  
  // Tous les utilisateurs peuvent ajouter des contres aux défenses publiques
  const canAddCounter = defense.isPublic || (session?.user?.id ? canEditDefensePermission(defense.userId, session.user.id) : false)

  const fetchMonsterImagesForCounters = useCallback(async (monsterNames: string[]) => {
    const uniqueMonsters = Array.from(new Set(monsterNames)).filter(Boolean)
    if (uniqueMonsters.length === 0) return

    // Charger depuis le cache
    await getMonstersFromCache()
    const images = await preloadMonsterImages(uniqueMonsters)
    // Utiliser directement les images de preloadMonsterImages (qui sont toujours Swarfarm)
    setMonsterImages(prevImages => ({ ...prevImages, ...images }))
  }, [])

  // Charger les images des contres si déjà présents
  useEffect(() => {
    if (defense?.counters && defense.counters.length > 0) {
      const allCounterMonsters: string[] = []
      defense.counters.forEach((counter: Counter) => {
        const monsters = JSON.parse(counter.counterMonsters)
        allCounterMonsters.push(...monsters)
      })
      if (allCounterMonsters.length > 0) {
        fetchMonsterImagesForCounters(allCounterMonsters)
      }
    }
  }, [defense?.counters, fetchMonsterImagesForCounters])

  const fetchMonsterImages = useCallback(async () => {
    const monstersToFetch = [defense.leaderMonster, defense.monster2, defense.monster3].filter(Boolean)
    if (monstersToFetch.length === 0) return

    // Charger depuis le cache
    await getMonstersFromCache()
    const images = await preloadMonsterImages(monstersToFetch)
    // Utiliser directement les images de preloadMonsterImages (qui sont toujours Swarfarm)
    setMonsterImages(prev => ({ ...prev, ...images }))
  }, [defense.leaderMonster, defense.monster2, defense.monster3])

  useEffect(() => {
    fetchMonsterImages()
    setFailedImages(new Set())
  }, [fetchMonsterImages])

  const fetchCounters = useCallback(async () => {
    setLoadingCounters(true)
    try {
      const response = await fetch(`/api/defenses/${defense.id}/counters`)
      if (response.ok) {
        const data = await response.json()
        // S'assurer que les contres ont les champs createdBy et updatedBy
        // Les contres sont déjà triés par l'API (par likes décroissant)
        const countersWithFields = data.map((counter: any) => ({
          ...counter,
          createdBy: counter.createdBy || '',
          updatedBy: counter.updatedBy || '',
          likes: counter.likes || 0, // Inclure le nombre de likes
        }))
        setCounters(countersWithFields || [])
        const allCounterMonsters: string[] = []
        data.forEach((counter: Counter) => {
          const monsters = JSON.parse(counter.counterMonsters)
          allCounterMonsters.push(...monsters)
        })
        if (allCounterMonsters.length > 0) {
          fetchMonsterImagesForCounters(allCounterMonsters)
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des contres:', error)
    } finally {
      setLoadingCounters(false)
    }
  }, [defense.id, fetchMonsterImagesForCounters])

  useEffect(() => {
    if (activeTab === 'contres') {
      if (counters.length === 0) {
        fetchCounters()
      } else {
        // Si les contres sont déjà chargés, charger les images
        const allCounterMonsters: string[] = []
        counters.forEach((counter: Counter) => {
          const monsters = JSON.parse(counter.counterMonsters)
          allCounterMonsters.push(...monsters)
        })
        if (allCounterMonsters.length > 0) {
          fetchMonsterImagesForCounters(allCounterMonsters)
        }
      }
    }
  }, [activeTab, counters, fetchMonsterImagesForCounters, fetchCounters])

  const handleDeleteCounter = async (counterId: string) => {
    if (!confirm(t('defenses.deleteConfirm'))) return

    try {
      const response = await fetch(`/api/counters/${counterId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        // Retirer le contre de la liste locale
        setCounters(counters.filter(c => c.id !== counterId))
        // Recharger les contres depuis le serveur pour s'assurer de la cohérence
        await fetchCounters()
      } else {
        const errorData = await response.json()
        alert(errorData.error || t('defenses.deleteCounterError'))
      }
    } catch (error) {
      console.error(t('defenses.deleteCounterError'), error)
      alert(t('defenses.deleteCounterError'))
    }
  }

  // Trier les contres par likes si ils viennent de defense.counters (initial)
  useEffect(() => {
    if (defense?.counters && defense.counters.length > 0) {
      // Les contres sont déjà triés par transformDefense, mais on s'assure qu'ils ont les champs likes et dislikes
      const countersWithVotes = defense.counters.map((counter: any) => ({
        ...counter,
        likes: counter.likes || 0,
        dislikes: counter.dislikes || 0,
      }))
      setCounters(countersWithVotes)
    }
  }, [defense?.counters])


  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString(locale === 'en' ? 'en-US' : 'fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>, monsterName: string) => {
    const img = e.currentTarget
    const currentSrc = img.src
    
    // Si c'est déjà Swarfarm qui échoue, marquer comme échoué
    if (currentSrc.includes('swarfarm.com')) {
      setFailedImages(prev => {
        const newSet = new Set(prev)
        newSet.add(monsterName)
        return newSet
      })
      return
    }
    
    // Si c'est une URL locale qui échoue, essayer Swarfarm
    const monsters = getAllMonsterImages()
    const swarfarmUrl = monsters[monsterName]
    if (swarfarmUrl && swarfarmUrl.includes('swarfarm.com')) {
      img.src = swarfarmUrl
      return
    }
    
    // Sinon, marquer comme échoué
    setFailedImages(prev => {
      const newSet = new Set(prev)
      newSet.add(monsterName)
      return newSet
    })
  }

  const renderMonsterIcon = (monsterName: string, fallbackText: string) => {
    const imageUrl = monsterImages[monsterName]
    const hasFailed = failedImages.has(monsterName)
    
    return (
      <div className="w-16 h-16 bg-slate-700 rounded-lg flex items-center justify-center overflow-hidden relative">
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

  const parseList = (value: string | null): string[] => {
    if (!value) return []
    return value.split('\n').filter(item => item.trim().length > 0)
  }


  const tabs: { id: typeof activeTab; label: string }[] = [
    { id: 'apercu', label: t('defenses.defense') },
    { id: 'contres', label: t('defenses.counters') },
  ]

  return (
    <div className="space-y-6 w-full">
      {/* Header avec flèche retour, titre et bouton d&apos;édition */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.push('/defenses')}
          className="p-2 text-blue-400 hover:text-blue-300 hover:bg-slate-700 rounded-lg transition-colors flex-shrink-0"
          title={t('defenses.backToDefenses')}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-xl sm:text-2xl font-bold text-white flex-1">{t('defenses.defenseDetails')}</h2>
        {onEdit && canEditDefense && (
          <button
            onClick={() => onEdit()}
            className="p-2 text-blue-400 hover:text-blue-300 hover:bg-slate-700 rounded-lg transition-colors flex-shrink-0"
            title={t('defenses.editDefenseTitle')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
        )}
      </div>

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

      {/* Tab content */}
      <div>
        {activeTab === 'apercu' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-blue-400 mb-2">
                {t('defenses.defense')}:
              </label>
              <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                <div className="flex justify-start gap-2 mb-4 flex-nowrap overflow-x-auto">
                  <div className="flex flex-col items-center min-w-[80px] flex-shrink-0">
                    <div className="w-16 h-16 flex-shrink-0">
                      {renderMonsterIcon(defense.leaderMonster, t('defenses.leader'))}
                    </div>
                    <span className="text-xs sm:text-sm text-white mt-2 text-center whitespace-nowrap overflow-hidden text-ellipsis max-w-[80px] block">{defense.leaderMonster}</span>
                  </div>
                  <div className="flex flex-col items-center min-w-[80px] flex-shrink-0">
                    <div className="w-16 h-16 flex-shrink-0">
                      {renderMonsterIcon(defense.monster2, t('defenses.monster2'))}
                    </div>
                    <span className="text-xs sm:text-sm text-white mt-2 text-center whitespace-nowrap overflow-hidden text-ellipsis max-w-[80px] block">{defense.monster2}</span>
                  </div>
                  <div className="flex flex-col items-center min-w-[80px] flex-shrink-0">
                    <div className="w-16 h-16 flex-shrink-0">
                      {renderMonsterIcon(defense.monster3, t('defenses.monster3'))}
                    </div>
                    <span className="text-xs sm:text-sm text-white mt-2 text-center whitespace-nowrap overflow-hidden text-ellipsis max-w-[80px] block">{defense.monster3}</span>
                  </div>
                </div>
              </div>
            </div>

            {defense.attackSequence && (
              <div>
                <label className="block text-sm font-medium text-blue-400 mb-2">{t('defenses.attackSequence')}:</label>
                <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 text-white whitespace-pre-wrap">
                  {defense.attackSequence}
                </div>
              </div>
            )}

            {defense.notes && (
              <div>
                <label className="block text-sm font-medium text-blue-400 mb-2">{t('defenses.notes')}:</label>
                <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 text-white whitespace-pre-wrap">
                  {defense.notes}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-4 gap-4">
              <VoteButtons entityId={defense.id} entityType="defense" />
              <div className="text-xs sm:text-sm text-gray-400">
                <div>{t('defenses.addedBy')}: {defense.createdBy} {t('defenses.on')} {formatDate(defense.createdAt)}</div>
                <div className="mt-1">
                  {t('defenses.lastUpdateBy')}: {defense.updatedBy} {t('defenses.on')} {formatDate(defense.updatedAt)}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'contres' && (
          <div className="space-y-6">
            {loadingCounters ? (
              <div className="text-gray-400 text-center py-8">{t('defenses.loadingCounters')}</div>
            ) : (
              <>
                {counters.length === 0 ? (
                  <div className="text-gray-400 text-center py-8">{t('defenses.noCounters')}</div>
                ) : (
                  <div className="space-y-4">
                    {counters.map((counter) => {
                      const monsters = JSON.parse(counter.counterMonsters)
                      const [leader, monster2, monster3] = monsters
                      
                      // Vérifier si l'utilisateur peut modifier ce contre spécifique (seulement créateur ou admin)
                      const userIdentifier = session?.user?.name || session?.user?.identifier || ''
                      const isCounterCreator = counter.createdBy === userIdentifier || counter.createdBy === session?.user?.identifier || counter.createdBy === session?.user?.name
                      const canEditAllDefenses = permissions?.role === 'admin' || permissions?.canEditAllDefenses === true
                      const canEditThisCounter = isCounterCreator || canEditAllDefenses
                      
                      return (
                        <div key={counter.id} className="bg-slate-800 p-4 rounded-lg border border-slate-700 relative">
                          {/* Boutons d'édition et suppression - seulement si l'utilisateur peut modifier */}
                          {/* En mobile: bas à droite, en desktop: haut à droite pour éviter le chevauchement avec les boutons likes */}
                          {canEditThisCounter && (
                            <div className="absolute bottom-2 right-2 sm:bottom-auto sm:top-4 sm:right-4 flex gap-2 z-10">
                              {onEdit && (
                                <button
                                  onClick={() => onEdit('contres', counter.id)}
                                  className="p-2 text-blue-400 hover:text-blue-300 hover:bg-slate-700 rounded-lg transition-colors flex-shrink-0"
                                  title={t('defenses.editCounterTitle')}
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                  </svg>
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteCounter(counter.id)}
                                className="p-2 text-red-400 hover:text-red-300 hover:bg-slate-700 rounded-lg transition-colors flex-shrink-0"
                                  title={t('defenses.deleteCounterTitle')}
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          )}
                          <div className="flex justify-start gap-2 mb-4 flex-nowrap overflow-x-auto">
                            <div className="flex flex-col items-center min-w-[80px] flex-shrink-0">
                              <div className="w-16 h-16 flex-shrink-0">
                                {renderMonsterIcon(leader || '', 'Leader')}
                              </div>
                              <span className="text-xs sm:text-sm text-white mt-2 text-center whitespace-nowrap overflow-hidden text-ellipsis max-w-[80px] block">{leader || t('defenses.leader')}</span>
                            </div>
                            <div className="flex flex-col items-center min-w-[80px] flex-shrink-0">
                              <div className="w-16 h-16 flex-shrink-0">
                                {renderMonsterIcon(monster2 || '', 'Monstre 2')}
                              </div>
                              <span className="text-xs sm:text-sm text-white mt-2 text-center whitespace-nowrap overflow-hidden text-ellipsis max-w-[80px] block">{monster2 || t('defenses.monster2')}</span>
                            </div>
                            <div className="flex flex-col items-center min-w-[80px] flex-shrink-0">
                              <div className="w-16 h-16 flex-shrink-0">
                                {renderMonsterIcon(monster3 || '', 'Monstre 3')}
                              </div>
                              <span className="text-xs sm:text-sm text-white mt-2 text-center whitespace-nowrap overflow-hidden text-ellipsis max-w-[80px] block">{monster3 || t('defenses.monster3')}</span>
                            </div>
                          </div>
                          {counter.description && (
                            <div>
                              <label className="block text-sm font-medium text-blue-400 mb-2">{t('defenses.description')}:</label>
                              <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 text-white whitespace-pre-wrap">
                                {counter.description}
                              </div>
                            </div>
                          )}
                          <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div className="text-xs text-gray-500">
                              <div>{t('defenses.addedBy')}: {counter.createdBy || t('defenses.unspecified')}</div>
                              <div className="mt-1">
                                {t('defenses.lastUpdatedBy')}: {counter.updatedBy || t('defenses.unspecified')} {t('defenses.on')} {formatDate(counter.updatedAt)}
                              </div>
                            </div>
                            <VoteButtons entityId={counter.id} entityType="counter" />
                          </div>
                        </div>
                      )
                  })}
                </div>
                )}
                {canAddCounter && (
                  <div className="mt-6">
                    <Button
                      type="button"
                      onClick={() => {
                        if (onEdit) {
                          // Passer en mode édition avec l'onglet contres ouvert
                          onEdit('contres')
                        }
                      }}
                      className="w-full"
                    >
                      {t('defenses.addCounter')}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

      </div>
    </div>
  )
}

