'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { getMonstersFromCache } from '@/lib/monster-cache'
import { MonsterSelector } from '@/components/ui/MonsterSelector'
import { Button } from '@/components/ui/Button'
import { useI18n } from '@/lib/i18n-provider'

interface Monster {
  id: number
  name: string
  image_filename: string
  element?: string
  base_stars?: number
  natural_stars?: number
  unitMasterId?: number
  isManual?: boolean
  com2us_id?: number
  is_second_awakened?: boolean
  awaken_level?: number
  bestiary_slug?: string
}

interface User {
  id: string
  name: string | null
  identifier: string
}

const elementOrder: Record<string, number> = {
  'water': 1,
  'fire': 2,
  'wind': 3,
  'light': 4,
  'dark': 5,
}

// elementLabels sera défini dans le composant avec useI18n

// Fonction pour obtenir l'URL de l'icône d'élément depuis Swarfarm
function getElementIconUrl(element: string): string {
  const elementMap: Record<string, string> = {
    'water': 'https://swarfarm.com/static/herders/images/elements/water.png',
    'fire': 'https://swarfarm.com/static/herders/images/elements/fire.png',
    'wind': 'https://swarfarm.com/static/herders/images/elements/wind.png',
    'light': 'https://swarfarm.com/static/herders/images/elements/light.png',
    'dark': 'https://swarfarm.com/static/herders/images/elements/dark.png',
  }
  return elementMap[element] || ''
}

// Fonction pour obtenir l'URL de l'icône 2A depuis Swarfarm
function getSecondAwakeningIconUrl(): string {
  return 'https://swarfarm.com/static/herders/images/awakenings/second_awakening.png'
}

// Fonction pour normaliser la recherche (traduction anglais -> français)
function normalizeSearchQuery(query: string): string {
  const translations: Record<string, string> = {
    'water': 'eau',
    'fire': 'feu',
    'wind': 'vent',
    'light': 'lumière',
    'dark': 'ténèbres',
  }
  
  const lowerQuery = query.toLowerCase().trim()
  
  // Remplacer les termes anglais par leurs équivalents français
  let normalized = lowerQuery
  Object.entries(translations).forEach(([en, fr]) => {
    normalized = normalized.replace(new RegExp(`\\b${en}\\b`, 'gi'), fr)
  })
  
  return normalized
}

export default function MonstersPage() {
  const { data: session } = useSession()
  const { t } = useI18n()
  const [users, setUsers] = useState<User[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [monsters, setMonsters] = useState<Monster[]>([])
  const [monsterImages, setMonsterImages] = useState<Record<string, string>>({})
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [showAddMonster, setShowAddMonster] = useState(false)
  const [newMonsterName, setNewMonsterName] = useState('')
  const [addingMonster, setAddingMonster] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedElement, setSelectedElement] = useState<string | null>(null)
  const [selectedStars, setSelectedStars] = useState<number | null>(null)
  const [collapsedElements, setCollapsedElements] = useState<Set<string>>(
    new Set(['water', 'fire', 'wind', 'light', 'dark'])
  )
  const [globalSearchMode, setGlobalSearchMode] = useState(false)
  const [searchSuggestions, setSearchSuggestions] = useState<Monster[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [allMonstersForSearch, setAllMonstersForSearch] = useState<Monster[]>([])
  const [exactMonsterMatch, setExactMonsterMatch] = useState<string | null>(null)
  
  // Mémoriser elementLabels pour éviter les re-renders infinis
  const elementLabels = useMemo<Record<string, string>>(() => ({
    'water': t('monsters.elements.water'),
    'wind': t('monsters.elements.wind'),
    'fire': t('monsters.elements.fire'),
    'light': t('monsters.elements.light'),
    'dark': t('monsters.elements.dark'),
  }), [t])
  const [usersWithMonster, setUsersWithMonster] = useState<Array<{
    id: string
    name: string | null
    identifier: string
    count: number
    monsters: Monster[]
  }>>([])
  const [loadingUsers, setLoadingUsers] = useState(false)

  // Charger tous les monstres depuis le cache pour les suggestions de recherche (lazy load)
  useEffect(() => {
    // Ne charger que si nécessaire (quand on commence à taper ou qu'on active la recherche globale)
    if ((searchQuery.trim() || globalSearchMode) && allMonstersForSearch.length === 0) {
      getMonstersFromCache()
        .then(allMonsters => {
          setAllMonstersForSearch(allMonsters)
        })
        .catch(err => {
          console.error('Erreur lors du chargement des monstres pour la recherche:', err)
        })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, globalSearchMode]) // allMonstersForSearch.length retiré intentionnellement pour éviter les boucles

  // Générer les suggestions de recherche
  useEffect(() => {
    // Ne pas afficher de suggestions si un monstre exact est sélectionné
    if (exactMonsterMatch) {
      setSearchSuggestions([])
      setShowSuggestions(false)
      return
    }
    
    if (searchQuery.trim() === '') {
      setSearchSuggestions([])
      setShowSuggestions(false)
      return
    }

    const query = normalizeSearchQuery(searchQuery).toLowerCase()
    const suggestions = allMonstersForSearch
      .filter(monster => {
        const monsterName = monster.name.toLowerCase()
        const elementLabel = elementLabels[monster.element || '']?.toLowerCase() || ''
        return monsterName.includes(query) || elementLabel.includes(query)
      })
      .slice(0, 10) // Limiter à 10 suggestions
    
    setSearchSuggestions(suggestions)
    setShowSuggestions(suggestions.length > 0)
  }, [searchQuery, allMonstersForSearch, elementLabels, exactMonsterMatch])

  // Charger la liste des utilisateurs
  useEffect(() => {
    fetch('/api/users')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          // Trier les utilisateurs par ordre alphabétique (nom ou identifiant)
          const sortedUsers = [...data].sort((a, b) => {
            const nameA = (a.name || a.identifier).toLowerCase()
            const nameB = (b.name || b.identifier).toLowerCase()
            return nameA.localeCompare(nameB)
          })
          setUsers(sortedUsers)
          // Ne pas sélectionner d'utilisateur par défaut, laisser l'utilisateur choisir
        }
      })
      .catch(err => {
        console.error('Erreur lors du chargement des utilisateurs:', err)
      })
  }, [session])

  // Rechercher les utilisateurs possédant un monstre spécifique (mode recherche globale)
  useEffect(() => {
    // Permettre la recherche uniquement par élément et/ou étoiles, ou avec un nom de monstre
    if (globalSearchMode && (searchQuery.trim() || selectedElement || selectedStars !== null)) {
      setLoadingUsers(true)
      const params = new URLSearchParams()
      
      // Si un monstre exact est sélectionné, utiliser son nom exact, sinon utiliser la recherche textuelle
      if (exactMonsterMatch) {
        params.append('monsterName', exactMonsterMatch)
        params.append('exactMatch', 'true') // Indiquer que c'est une recherche exacte
      } else if (searchQuery.trim()) {
        params.append('monsterName', searchQuery.trim())
      }
      
      if (selectedElement) {
        params.append('element', selectedElement)
      }
      if (selectedStars !== null) {
        params.append('stars', selectedStars.toString())
      }
      
      fetch(`/api/monsters/search-users?${params.toString()}`)
        .then(res => {
          if (!res.ok) {
            return res.json().then(err => {
              throw new Error(err.error || 'Erreur lors de la recherche')
            })
          }
          return res.json()
        })
        .then(data => {
          // Trier les utilisateurs par ordre alphabétique (nom ou identifiant)
          const sortedUsers = (data.users || []).sort((a: any, b: any) => {
            const nameA = (a.name || a.identifier).toLowerCase()
            const nameB = (b.name || b.identifier).toLowerCase()
            return nameA.localeCompare(nameB)
          })
          setUsersWithMonster(sortedUsers)
          setLoadingUsers(false)
        })
        .catch(err => {
          console.error('Erreur lors de la recherche des utilisateurs:', err)
          setUsersWithMonster([])
          setLoadingUsers(false)
        })
    } else {
      setUsersWithMonster([])
    }
  }, [globalSearchMode, searchQuery, selectedElement, selectedStars, exactMonsterMatch])

  // Charger les monstres de l'utilisateur sélectionné
  useEffect(() => {
    // Ne pas charger les monstres si on est en mode recherche globale avec un filtre de nom
    if (globalSearchMode && searchQuery.trim()) {
      setMonsters([])
      setMonsterImages({}) // Nettoyer les images en mode recherche globale
      setFailedImages(new Set())
      setLoading(false)
      return
    }

    if (!selectedUserId) {
      setMonsters([])
      setMonsterImages({}) // Nettoyer les images quand aucun utilisateur n'est sélectionné
      setFailedImages(new Set())
      setLoading(false)
      return
    }

    setLoading(true)
    fetch(`/api/monsters/user/${selectedUserId}`)
      .then(res => res.json())
      .then(async data => {
        if (data.error && data.monsters === undefined) {
          console.error('Erreur:', data.error)
          setMonsters([])
          setLoading(false)
          return
        }

        const userMonsters = data.monsters || []
        setMonsters(userMonsters)

        // Préparer les URLs d'images (sans préchargement massif, le lazy loading s'en chargera)
        if (userMonsters.length > 0) {
          const images: Record<string, string> = {}
          userMonsters.forEach((monster: Monster) => {
            // Utiliser une clé composite pour les monstres collab avec le même nom
            const imageKey = `${monster.name}-${monster.element || 'default'}`
            images[imageKey] = `https://swarfarm.com/static/herders/images/monsters/${monster.image_filename}`
            // Garder aussi la clé par nom pour compatibilité
            images[monster.name] = `https://swarfarm.com/static/herders/images/monsters/${monster.image_filename}`
          })
          setMonsterImages(images)
          setFailedImages(new Set())
        }
        setLoading(false)
      })
      .catch(err => {
        console.error('Erreur lors du chargement des monstres:', err)
        setMonsters([])
        setMonsterImages({}) // Nettoyer les images en cas d'erreur
        setFailedImages(new Set())
        setLoading(false)
      })
  }, [selectedUserId, globalSearchMode, searchQuery]) // Retirer selectedElement et selectedStars qui ne sont pas utilisés

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>, monsterName: string, element?: string) => {
    const img = e.currentTarget
    const currentSrc = img.src

    if (currentSrc.includes('swarfarm.com')) {
      const imageKey = element ? `${monsterName}-${element}` : monsterName
      setFailedImages(prev => new Set(prev).add(imageKey))
      setFailedImages(prev => new Set(prev).add(monsterName))
      return
    }

    // Essayer avec la clé composite si disponible
    if (element) {
      const imageKey = `${monsterName}-${element}`
      const swarfarmUrl = monsterImages[imageKey]
      if (swarfarmUrl && swarfarmUrl.includes('swarfarm.com')) {
        img.src = swarfarmUrl
        return
      }
    }

    const swarfarmUrl = monsterImages[monsterName]
    if (swarfarmUrl && swarfarmUrl.includes('swarfarm.com')) {
      img.src = swarfarmUrl
      return
    }

    const imageKey = element ? `${monsterName}-${element}` : monsterName
    setFailedImages(prev => new Set(prev).add(imageKey))
    setFailedImages(prev => new Set(prev).add(monsterName))
  }

  const handleAddMonster = async () => {
    if (!newMonsterName.trim() || !selectedUserId) return

    setAddingMonster(true)
    try {
      const response = await fetch(`/api/monsters/user/${selectedUserId}/manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monsterName: newMonsterName }),
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.error || 'Erreur lors de l\'ajout du monstre')
        return
      }

      // Recharger les monstres
      setNewMonsterName('')
      setShowAddMonster(false)
      // Recharger les monstres en déclenchant le useEffect
      const reloadResponse = await fetch(`/api/monsters/user/${selectedUserId}`)
      const reloadData = await reloadResponse.json()
      if (reloadData.monsters) {
        setMonsters(reloadData.monsters)
        const images: Record<string, string> = {}
        reloadData.monsters.forEach((monster: Monster) => {
          const imageKey = `${monster.name}-${monster.element || 'default'}`
          images[imageKey] = `https://swarfarm.com/static/herders/images/monsters/${monster.image_filename}`
          images[monster.name] = `https://swarfarm.com/static/herders/images/monsters/${monster.image_filename}`
        })
        setMonsterImages(images)
        setFailedImages(new Set())
      }
    } catch (err) {
      console.error('Erreur lors de l\'ajout du monstre:', err)
      alert('Erreur lors de l\'ajout du monstre')
    } finally {
      setAddingMonster(false)
    }
  }

  const handleDeleteMonster = async (monsterName: string) => {
    if (!selectedUserId || !confirm(t('monsters.deleteMonster', { monster: monsterName }))) return

    try {
      const response = await fetch(`/api/monsters/user/${selectedUserId}/manual?monsterName=${encodeURIComponent(monsterName)}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        alert(data.error || 'Erreur lors de la suppression')
        return
      }

      // Recharger les monstres
      const reloadResponse = await fetch(`/api/monsters/user/${selectedUserId}`)
      const reloadData = await reloadResponse.json()
      if (reloadData.monsters) {
        setMonsters(reloadData.monsters)
        const images: Record<string, string> = {}
        reloadData.monsters.forEach((monster: Monster) => {
          const imageKey = `${monster.name}-${monster.element || 'default'}`
          images[imageKey] = `https://swarfarm.com/static/herders/images/monsters/${monster.image_filename}`
          images[monster.name] = `https://swarfarm.com/static/herders/images/monsters/${monster.image_filename}`
        })
        setMonsterImages(images)
        setFailedImages(new Set())
      }
    } catch (err) {
      console.error('Erreur lors de la suppression du monstre:', err)
      alert(t('monsters.deleteError'))
    }
  }

  // Fonction de filtrage par recherche, élément et étoiles
  const filterMonsters = useCallback((monstersList: Monster[], query: string, element: string | null, stars: number | null, exactMatch: string | null): Monster[] => {
    return monstersList.filter(monster => {
      // Filtre par recherche de nom
      let matchesSearch = true
      if (query.trim()) {
        // Si on a une correspondance exacte, filtrer uniquement sur ce nom
        if (exactMatch) {
          matchesSearch = monster.name === exactMatch
        } else {
          const normalizedQuery = normalizeSearchQuery(query)
          const lowerQuery = normalizedQuery.toLowerCase()
          const monsterName = monster.name.toLowerCase()
          const elementLabel = elementLabels[monster.element || '']?.toLowerCase() || ''
          matchesSearch = monsterName.includes(lowerQuery) || elementLabel.includes(lowerQuery)
        }
      }
      
      // Filtre par élément (case-insensitive)
      const matchesElement = !element || 
        (monster.element && monster.element.toLowerCase() === element.toLowerCase())
      
      // Filtre par étoiles naturelles (utiliser natural_stars si disponible, sinon base_stars)
      const monsterStars = monster.natural_stars ?? monster.base_stars
      const matchesStars = stars === null || monsterStars === stars
      
      return matchesSearch && matchesElement && matchesStars
    })
  }, [elementLabels])

  // Filtrer les monstres par recherche, élément et étoiles (mémorisé)
  const filteredMonsters = useMemo(() => 
    filterMonsters(monsters, searchQuery, selectedElement, selectedStars, exactMonsterMatch),
    [monsters, searchQuery, selectedElement, selectedStars, exactMonsterMatch, filterMonsters]
  )

  // Grouper les monstres par élément (mémorisé)
  const monstersByElement = useMemo(() => {
    const grouped: Record<string, Monster[]> = {}
    filteredMonsters.forEach(monster => {
      const element = monster.element || 'unknown'
      if (!grouped[element]) {
        grouped[element] = []
      }
      grouped[element].push(monster)
    })
    return grouped
  }, [filteredMonsters])

  // Trier les monstres dans chaque catégorie et les éléments (mémorisé)
  const finalSortedElements = useMemo(() => {
    // Créer une copie pour ne pas muter l'objet original
    const sortedByElement: Record<string, Monster[]> = {}
    Object.keys(monstersByElement).forEach(element => {
      sortedByElement[element] = [...monstersByElement[element]].sort((a, b) => {
        // Priorité absolue : awaken_level === 2 en premier dans chaque catégorie
        // Convertir en nombre pour être sûr de la comparaison
        const aAwakenLevel = Number(a.awaken_level) || 0
        const bAwakenLevel = Number(b.awaken_level) || 0
        const aIs2A = aAwakenLevel === 2
        const bIs2A = bAwakenLevel === 2
        
        // Si l'un est 2A et l'autre non, le 2A vient en premier
        if (aIs2A && !bIs2A) return -1
        if (!aIs2A && bIs2A) return 1
        
        // Si les deux sont 2A ou les deux ne sont pas 2A, trier par base_stars décroissant (5 > 4 > 3 > 2 > 1)
        const aStars = a.base_stars || 0
        const bStars = b.base_stars || 0
        if (bStars !== aStars) return bStars - aStars
        
        // Tri secondaire : com2us_id décroissant (le plus haut en premier)
        const aCom2usId = a.com2us_id || a.id || 0
        const bCom2usId = b.com2us_id || b.id || 0
        return bCom2usId - aCom2usId
      })
    })

    // Trier les éléments selon l'ordre défini : Water -> Fire -> Wind -> Light -> Dark
    const elementOrderArray = ['water', 'fire', 'wind', 'light', 'dark']
    
    // Obtenir tous les éléments disponibles (normalisés en minuscules)
    const availableElements = Object.keys(sortedByElement)
      .filter(element => sortedByElement[element] && sortedByElement[element].length > 0)
      .map(element => ({ original: element, normalized: element.toLowerCase() }))
    
    // Trier : d'abord ceux dans elementOrderArray dans l'ordre défini, puis les autres
    return elementOrderArray
      .map(el => {
        const found = availableElements.find(ae => ae.normalized === el.toLowerCase())
        return found ? found.original : null
      })
      .filter((el): el is string => el !== null)
      .concat(
        availableElements
          .filter(ae => !elementOrderArray.some(eoa => eoa.toLowerCase() === ae.normalized))
          .map(ae => ae.original)
          .sort((a, b) => {
            const orderA = elementOrder[a.toLowerCase()] || 999
            const orderB = elementOrder[b.toLowerCase()] || 999
            return orderA - orderB
          })
      )
  }, [monstersByElement])

  // Fonction pour toggle l'état replié/déplié d'une catégorie
  const toggleElementCollapse = (element: string) => {
    setCollapsedElements(prev => {
      const newSet = new Set(prev)
      if (newSet.has(element)) {
        newSet.delete(element)
      } else {
        newSet.add(element)
      }
      return newSet
    })
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-8">{t('monsters.title')}</h1>

      {/* Sélecteur d'utilisateur et mode recherche globale */}
      <div className="mb-6 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
          <div className="flex-1 md:flex-initial">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {t('monsters.user')}
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => {
                setSelectedUserId(e.target.value)
                setGlobalSearchMode(false)
              }}
              disabled={globalSearchMode}
              className="w-full md:w-64 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">{t('monsters.selectUser')}</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name || user.identifier}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Option recherche globale */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="globalSearchMode"
            checked={globalSearchMode}
            onChange={(e) => {
              setGlobalSearchMode(e.target.checked)
              if (e.target.checked) {
                setSelectedUserId('')
                // Ne pas réinitialiser selectedElement et selectedStars pour permettre leur utilisation en mode recherche globale
              }
            }}
            className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500"
          />
          <label htmlFor="globalSearchMode" className="text-sm text-gray-300 cursor-pointer">
            {t('monsters.globalSearch')}
          </label>
        </div>

        {/* Bouton pour ajouter un monstre manuellement */}
        {selectedUserId && session?.user?.id === selectedUserId && (
          <div>
            {!showAddMonster ? (
              <Button
                type="button"
                variant="primary"
                onClick={() => setShowAddMonster(true)}
              >
                {t('monsters.addMonster')}
              </Button>
            ) : (
              <div className="flex flex-col md:flex-row gap-2">
                <div className="w-full md:w-64">
                  <MonsterSelector
                    label=""
                    value={newMonsterName}
                    onChange={setNewMonsterName}
                    placeholder={t('monsters.searchPlaceholder')}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleAddMonster}
                    disabled={addingMonster || !newMonsterName.trim()}
                  >
                    {addingMonster ? t('monsters.adding') : t('common.add')}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setShowAddMonster(false)
                      setNewMonsterName('')
                    }}
                  >
                    {t('common.cancel')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Champ de recherche avec autocomplétion */}
      <div className="mb-6 relative">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          {t('monsters.searchMonster')}
        </label>
        <div className="relative">
          <input
            type="text"
            value={exactMonsterMatch || searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setExactMonsterMatch(null) // Réinitialiser la correspondance exacte quand on tape
              setShowSuggestions(true)
            }}
            onFocus={() => {
              if (searchSuggestions.length > 0) {
                setShowSuggestions(true)
              }
            }}
            onBlur={() => {
              // Délai pour permettre le clic sur une suggestion
              setTimeout(() => {
                setShowSuggestions(false)
              }, 200)
            }}
            placeholder={t('monsters.searchPlaceholder')}
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('')
                setExactMonsterMatch(null)
                setShowSuggestions(false)
              }}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
            >
              ×
            </button>
          )}
          {showSuggestions && searchSuggestions.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-h-96 overflow-y-auto">
              <div className="py-2">
                {searchSuggestions.map((monster) => (
                  <button
                    key={monster.id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault() // Empêcher onBlur de se déclencher
                      const monsterName = monster.name
                      setSearchQuery(monsterName)
                      setExactMonsterMatch(monsterName)
                      setShowSuggestions(false)
                    }}
                    className="w-full px-4 py-2 flex items-center gap-3 hover:bg-slate-700 transition-colors text-left"
                  >
                    <img
                      src={`https://swarfarm.com/static/herders/images/monsters/${monster.image_filename}`}
                      alt={monster.name}
                      className="w-10 h-10 rounded flex-shrink-0"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                    <span className="text-white text-sm flex-1">{monster.name}</span>
                    {(monster.natural_stars ?? monster.base_stars) && (
                      <span className="text-yellow-400 text-xs">
                        {'⭐'.repeat(monster.natural_stars ?? monster.base_stars ?? 0)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filtres par élément et étoiles */}
      <div className="mb-6 space-y-4">
        {/* Filtres par élément */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {t('monsters.filterByElement')}
          </label>
          <div className="flex flex-wrap gap-2">
            {['water', 'fire', 'wind', 'light', 'dark'].map((element) => {
              const elementLabel = elementLabels[element] || element
              const elementIconUrl = getElementIconUrl(element)
              const isActive = selectedElement?.toLowerCase() === element.toLowerCase()
              
              return (
                <button
                  key={element}
                  onClick={() => {
                    // Toggle: si déjà sélectionné, désélectionner
                    setSelectedElement(isActive ? null : element)
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-colors ${
                    isActive
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-slate-700 border-slate-600 text-gray-300 hover:bg-slate-600'
                  }`}
                >
                    {elementIconUrl && (
                      <img
                        src={elementIconUrl}
                        alt={element}
                        className="w-5 h-5"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    )}
                  <span className="capitalize">{elementLabel}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Filtres par étoiles */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {t('monsters.filterByStars')}
          </label>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map((stars) => {
              const isActive = selectedStars === stars
              
              return (
                <button
                  key={stars}
                  onClick={() => {
                    // Toggle: si déjà sélectionné, désélectionner
                    setSelectedStars(isActive ? null : stars)
                  }}
                  className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                    isActive
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-slate-700 border-slate-600 text-gray-300 hover:bg-slate-600'
                  }`}
                >
                  <span className="flex items-center gap-1">
                    {'⭐'.repeat(stars)}
                    <span className="ml-1">{stars}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Affichage des utilisateurs possédant le monstre (mode recherche globale) */}
      {globalSearchMode && (searchQuery.trim() || selectedElement || selectedStars !== null) ? (
        loadingUsers ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-400">{t('monsters.searchingUsers')}</div>
          </div>
        ) : usersWithMonster.length === 0 ? (
          <div className="bg-slate-800 rounded-lg p-8 text-center">
            <p className="text-gray-400">
              {searchQuery.trim()
                ? t('monsters.noUsersWithMonster', { monster: searchQuery })
                : t('monsters.noUsersWithFilters')
              }
            </p>
          </div>
        ) : (
          <div className="bg-slate-800 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">
              {searchQuery.trim() 
                ? t('monsters.usersWithMonster', { monster: searchQuery })
                : (() => {
                    const filters: string[] = []
                    if (selectedElement) {
                      filters.push(elementLabels[selectedElement])
                    }
                    if (selectedStars !== null) {
                      filters.push(`${selectedStars} ${t('monsters.stars')}`)
                    }
                    return filters.length > 0 
                      ? `${t('monsters.usersWithFilters')} (${filters.join(', ')})`
                      : t('monsters.usersWithFilters')
                  })()
              } ({usersWithMonster.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {usersWithMonster.map(user => (
                <div
                  key={user.id}
                  className="bg-slate-700 rounded-lg p-4 border border-slate-600 hover:border-blue-500 transition-colors cursor-pointer"
                  onClick={() => {
                    setSelectedUserId(user.id)
                    setGlobalSearchMode(false)
                  }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{user.name || user.identifier}</p>
                      <p className="text-blue-400 text-sm font-semibold mt-1">
                        x{user.count}
                      </p>
                    </div>
                  </div>
                  {user.monsters && user.monsters.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {user.monsters.map((monster: any, index: number) => (
                        <div
                          key={`${monster.id}-${index}`}
                          className="w-10 h-10 flex-shrink-0 bg-slate-600 rounded-lg overflow-hidden border border-slate-500"
                          title={monster.name}
                        >
                          <img
                            src={`https://swarfarm.com/static/herders/images/monsters/${monster.image_filename}`}
                            alt={monster.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      ) : loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-400">{t('monsters.loadingMonsters')}</div>
        </div>
      ) : monsters.length === 0 ? (
        <div className="bg-slate-800 rounded-lg p-8 text-center">
          <p className="text-gray-400">
            {selectedUserId
              ? t('monsters.noMonsters')
              : globalSearchMode
              ? t('monsters.enterMonsterName')
              : t('monsters.selectUserToSee')}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {finalSortedElements.map(element => {
            const elementMonsters = monstersByElement[element] || []
            const isCollapsed = collapsedElements.has(element)
            const elementIconUrl = getElementIconUrl(element)

            return (
              <div key={element} className="bg-slate-800 rounded-lg p-6">
                {/* En-tête cliquable avec icône d'élément et chevron */}
                <button
                  onClick={() => toggleElementCollapse(element)}
                  className="w-full flex items-center justify-between mb-4 hover:opacity-80 transition-opacity"
                >
                  <div className="flex items-center gap-3">
                    {elementIconUrl && (
                      <img
                        src={elementIconUrl}
                        alt={element}
                        className="w-6 h-6"
                        loading="lazy"
                        onError={(e) => {
                          // Si l'icône ne charge pas, masquer l'image
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    )}
                    <h2 className="text-xl font-bold text-white">
                      {elementLabels[element] || element}
                    </h2>
                    <span className="text-sm text-gray-400">
                      ({elementMonsters.length})
                    </span>
                  </div>
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${isCollapsed ? '' : 'rotate-180'}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {/* Contenu conditionnellement affiché */}
                {!isCollapsed && (
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-3">
                    {elementMonsters.map((monster, index) => {
                      // Utiliser image_filename directement pour les monstres collab avec le même nom
                      const imageKey = `${monster.name}-${monster.element || 'default'}`
                      const imageUrl = monsterImages[imageKey] || monsterImages[monster.name] || `https://swarfarm.com/static/herders/images/monsters/${monster.image_filename}`
                      const hasFailed = failedImages.has(imageKey) || failedImages.has(monster.name)
                      // Convertir en nombre pour être sûr de la comparaison
                      const awakenLevel = Number(monster.awaken_level) || 0
                      const isSecondAwakened = awakenLevel === 2
                      // Construire bestiary_slug si non disponible
                      const bestiarySlug = monster.bestiary_slug || `${monster.id}-${monster.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`
                      const swarfarmUrl = `https://swarfarm.com/bestiary/${bestiarySlug}/`

                      return (
                        <div
                          key={`${monster.id}-${monster.unitMasterId || monster.name}-${index}`}
                          className="relative aspect-square bg-slate-700 rounded-lg overflow-hidden border-2 border-slate-600 flex items-center justify-center group cursor-pointer"
                          title={monster.name}
                          onClick={() => window.open(swarfarmUrl, '_blank')}
                        >
                          {imageUrl && !hasFailed ? (
                            <img
                              src={imageUrl}
                              alt={monster.name}
                              className="w-full h-full object-cover"
                              title={monster.name}
                              loading="lazy"
                              onError={(e) => handleImageError(e, monster.name, monster.element)}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="text-xs text-gray-400 text-center px-1">
                                {monster.name}
                              </span>
                            </div>
                          )}
                          
                          {/* Icône 2A si le monstre a un double éveil */}
                          {isSecondAwakened && (
                            <div className="absolute top-1 left-1 w-6 h-6 bg-yellow-600 rounded-full flex items-center justify-center z-10" title={t('monsters.secondAwakening')}>
                              <img
                                src={getSecondAwakeningIconUrl()}
                                alt="2A"
                                className="w-4 h-4"
                                loading="lazy"
                                onError={(e) => {
                                  // Si l'icône ne charge pas, afficher un badge texte
                                  e.currentTarget.style.display = 'none'
                                  const parent = e.currentTarget.parentElement
                                  if (parent) {
                                    parent.innerHTML = '<span class="text-xs text-white font-bold">2A</span>'
                                  }
                                }}
                              />
                            </div>
                          )}
                          
                          {/* Bouton supprimer pour les monstres manuels */}
                          {monster.isManual && selectedUserId === session?.user?.id && (
                            <button
                              onClick={() => handleDeleteMonster(monster.name)}
                              className="absolute top-1 right-1 w-6 h-6 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                              title="Supprimer"
                            >
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

