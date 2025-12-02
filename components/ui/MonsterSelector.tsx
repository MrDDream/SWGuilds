'use client'

import { useState, useEffect, useRef } from 'react'
import { getMonstersFromCache } from '@/lib/monster-cache'
import { useI18n } from '@/lib/i18n-provider'

interface Monster {
  id: number
  name: string
  image_filename: string
  element?: string
  base_stars?: number
  natural_stars?: number
}

interface MonsterSelectorProps {
  label?: string
  value: string
  onChange: (monsterName: string) => void
  placeholder?: string
  required?: boolean
  className?: string
}

export function MonsterSelector({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  className = '',
}: MonsterSelectorProps) {
  const { t } = useI18n()
  const defaultPlaceholder = placeholder || t('defenses.searchMonsterPlaceholder')
  const [monsters, setMonsters] = useState<Monster[]>([])
  const [filteredMonsters, setFilteredMonsters] = useState<Monster[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedMonster, setSelectedMonster] = useState<Monster | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchMonsters()
  }, [])

  useEffect(() => {
    // Trouver le monstre sélectionné par nom
    if (value && monsters.length > 0) {
      const monster = monsters.find(m => m.name === value)
      setSelectedMonster(monster || null)
    } else {
      setSelectedMonster(null)
    }
  }, [value, monsters])

  useEffect(() => {
    // Filtrer les monstres selon la recherche
    // Ne rien afficher tant qu'on n'a pas commencé à taper
    if (searchQuery.trim() === '') {
      setFilteredMonsters([])
    } else {
      const query = searchQuery.toLowerCase()
      const filtered = monsters
        .filter(monster => monster.name.toLowerCase().includes(query))
        .slice(0, 50)
      setFilteredMonsters(filtered)
    }
  }, [searchQuery, monsters])

  useEffect(() => {
    // Fermer le dropdown si on clique en dehors
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchMonsters = async () => {
    setLoading(true)
    try {
      const monsters = await getMonstersFromCache()
      setMonsters(monsters)
    } catch (error) {
      console.error('Erreur lors du chargement des monstres:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectMonster = (monster: Monster) => {
    setSelectedMonster(monster)
    onChange(monster.name)
    setIsOpen(false)
    setSearchQuery('')
  }

  const handleClear = () => {
    setSelectedMonster(null)
    onChange('')
    setSearchQuery('')
  }

  const getMonsterImageUrl = (imageFilename: string) => {
    // Utiliser directement Swarfarm - les images seront téléchargées en arrière-plan
    return `https://swarfarm.com/static/herders/images/monsters/${imageFilename}`
  }

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    // Si l'image locale ne charge pas, essayer Swarfarm directement
    const img = e.currentTarget
    const currentSrc = img.src
    // Si on est déjà sur Swarfarm, ne rien faire pour éviter une boucle infinie
    if (currentSrc.includes('swarfarm.com')) {
      img.style.display = 'none'
      return
    }
    // Sinon, essayer Swarfarm
    const filename = currentSrc.split('/').pop()
    if (filename) {
      img.src = `https://swarfarm.com/static/herders/images/monsters/${filename}`
    }
  }

  return (
    <div className={`w-full ${className}`} ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-blue-400 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        {/* Input avec icône du monstre sélectionné */}
        <div className="relative">
          {selectedMonster && !isOpen && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10">
              <img
                src={getMonsterImageUrl(selectedMonster.image_filename)}
                alt={selectedMonster.name}
                className="w-8 h-8 rounded"
                onError={handleImageError}
              />
            </div>
          )}
          <input
            type="text"
            value={isOpen ? searchQuery : (selectedMonster?.name || value || '')}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              if (!isOpen) setIsOpen(true)
              if (e.target.value === '') {
                handleClear()
              }
            }}
            onFocus={() => {
              setIsOpen(true)
              setSearchQuery('')
            }}
            placeholder={defaultPlaceholder}
            required={required}
            className={`w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              selectedMonster && !isOpen ? 'pl-12 pr-10' : 'pr-10'
            }`}
          />
          {selectedMonster && !isOpen && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleClear()
              }}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
            >
              ×
            </button>
          )}
        </div>

        {/* Dropdown avec liste des monstres */}
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-400">
                Chargement des monstres...
              </div>
            ) : filteredMonsters.length === 0 ? (
              <div className="p-4 text-center text-gray-400">
                Aucun monstre trouvé
              </div>
            ) : (
              <div className="py-2">
                {filteredMonsters.map((monster) => (
                  <button
                    key={monster.id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault() // Empêcher onBlur de se déclencher
                      handleSelectMonster(monster)
                    }}
                    className={`w-full px-4 py-2 flex items-center gap-3 hover:bg-slate-700 transition-colors ${
                      selectedMonster?.id === monster.id ? 'bg-slate-700' : ''
                    }`}
                  >
                    <img
                      src={getMonsterImageUrl(monster.image_filename)}
                      alt={monster.name}
                      className="w-10 h-10 rounded flex-shrink-0"
                      onError={handleImageError}
                    />
                    <span className="text-white text-sm">{monster.name}</span>
                    {(monster.natural_stars ?? monster.base_stars) && (
                      <span className="ml-auto text-yellow-400 text-xs">
                        {'⭐'.repeat(monster.natural_stars ?? monster.base_stars ?? 0)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

