'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Defense } from '@/types/defense'
import { VoteButtons } from '@/components/ui/VoteButtons'
import { getMonstersFromCache, preloadMonsterImages, getAllMonsterImages } from '@/lib/monster-cache'
import { useI18n } from '@/lib/i18n-provider'
import { getMonsterDisplayName } from '@/lib/monster-utils'

interface DefenseCardProps {
  defense: Defense
}

interface Monster {
  id: number
  name: string
  image_filename: string
}

export function DefenseCard({ defense }: DefenseCardProps) {
  const { t, locale } = useI18n()
  const [monsterImages, setMonsterImages] = useState<Record<string, string>>({})
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())

  const fetchMonsterImages = useCallback(async () => {
    const monstersToFetch = [defense.leaderMonster, defense.monster2, defense.monster3].filter(Boolean)
    if (monstersToFetch.length === 0) return

    // Charger depuis le cache
    await getMonstersFromCache()
    const images = await preloadMonsterImages(monstersToFetch)
    // Utiliser directement les images de preloadMonsterImages (qui sont toujours Swarfarm)
    setMonsterImages(images)
  }, [defense.leaderMonster, defense.monster2, defense.monster3])

  useEffect(() => {
    fetchMonsterImages()
    setFailedImages(new Set()) // Réinitialiser les erreurs quand les monstres changent
  }, [fetchMonsterImages])

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
      setFailedImages(prev => new Set(prev).add(monsterName))
      return
    }
    
    // Si c'est une URL locale qui échoue, essayer Swarfarm
    const monsters = getAllMonsterImages()
    // Chercher l'URL Swarfarm avec la clé de fallback
    const swarfarmKey = `${monsterName}_swarfarm`
    const swarfarmUrl = monsters[swarfarmKey] || monsters[monsterName]
    if (swarfarmUrl && swarfarmUrl.includes('swarfarm.com')) {
      img.src = swarfarmUrl
      return
    }
    
    // Sinon, marquer comme échoué
    setFailedImages(prev => new Set(prev).add(monsterName))
  }

  const renderMonsterIcon = (monsterName: string, fallbackText: string) => {
    const imageUrl = monsterImages[monsterName]
    const hasFailed = failedImages.has(monsterName)
    
    return (
      <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center overflow-hidden relative border-2 border-slate-600">
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

  return (
    <div className="bg-slate-800 rounded-lg p-4 hover:bg-slate-700 transition-colors border border-slate-700 relative" style={{ minHeight: '170px' }}>
      {/* Tag et épingle en haut à droite */}
      <div className="absolute top-2 right-2 flex items-center gap-2 z-10">
        {defense.tags && defense.tags.length > 0 && (
          <span
            className="px-2 py-1 text-xs font-medium rounded"
            style={{
              backgroundColor: defense.tags[0].tag.color + '40',
              color: defense.tags[0].tag.color,
              border: `1px solid ${defense.tags[0].tag.color}`,
            }}
          >
            {defense.tags[0].tag.name}
          </span>
        )}
        {defense.pinnedToDashboard && (
          <span className="text-pink-500 text-lg">📌</span>
        )}
      </div>
      
      <Link href={`/defenses/${defense.id}`} className="block pr-20 pb-6">
        {/* Icônes de monstres avec noms en dessous */}
        <div className="flex justify-center gap-1 mb-1" style={{ paddingLeft: '8px' }}>
          <div className="flex flex-col items-center min-w-[96px] flex-shrink-0">
            <div className="w-16 h-16 flex-shrink-0">
              {renderMonsterIcon(defense.leaderMonster, t('defenses.leader'))}
            </div>
            <span className="text-sm text-white mt-2.5 text-center whitespace-nowrap overflow-hidden text-ellipsis max-w-[96px] block bg-slate-900/70 px-1.5 py-0.5 rounded">{getMonsterDisplayName(defense.leaderMonster)}</span>
          </div>
          <div className="flex flex-col items-center min-w-[96px] flex-shrink-0">
            <div className="w-16 h-16 flex-shrink-0">
              {renderMonsterIcon(defense.monster2, t('defenses.monster2'))}
            </div>
            <span className="text-sm text-white mt-2.5 text-center whitespace-nowrap overflow-hidden text-ellipsis max-w-[96px] block bg-slate-900/70 px-1.5 py-0.5 rounded">{getMonsterDisplayName(defense.monster2)}</span>
          </div>
          <div className="flex flex-col items-center min-w-[96px] flex-shrink-0">
            <div className="w-16 h-16 flex-shrink-0">
              {renderMonsterIcon(defense.monster3, t('defenses.monster3'))}
            </div>
            <span className="text-sm text-white mt-2.5 text-center whitespace-nowrap overflow-hidden text-ellipsis max-w-[96px] block bg-slate-900/70 px-1.5 py-0.5 rounded">{getMonsterDisplayName(defense.monster3)}</span>
          </div>
        </div>
      </Link>
      
      {/* Date de mise à jour en bas à gauche */}
      <div className="absolute bottom-2 left-4 text-xs text-gray-500 text-left z-10">
        {t('defenses.updatedLabel')} {formatDate(defense.updatedAt)}
      </div>
      
      {/* Boutons de vote en bas à droite */}
      <div className="absolute bottom-2 right-4 z-10">
        <VoteButtons entityId={defense.id} entityType="defense" />
      </div>
    </div>
  )
}

