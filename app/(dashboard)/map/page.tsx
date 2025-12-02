'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/Button'
import { MapView } from '@/components/map/MapView'
import { TowerConfigModal } from '@/components/map/TowerConfigModal'
import { TowerList } from '@/components/map/TowerList'
import { useUserPermissions } from '@/hooks/useUserPermissions'
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

export default function MapPage() {
  const { data: session } = useSession()
  const { canEditMap } = useUserPermissions()
  const { t } = useI18n()
  const [mapName, setMapName] = useState('map.png')
  const [towers, setTowers] = useState<MapTower[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [selectedTower, setSelectedTower] = useState<MapTower | null>(null)
  const [showTowerList, setShowTowerList] = useState(false)
  const [showNames, setShowNames] = useState(false)
  const [loading, setLoading] = useState(true)
  const [nextTowerNumber, setNextTowerNumber] = useState<string>('1')

  const isAdmin = canEditMap()

  const fetchTowers = useCallback(async () => {
    try {
      const response = await fetch(`/api/map/towers?mapName=${mapName}`)
      if (response.ok) {
        const data = await response.json()
        setTowers(data)
        // Le prochain numéro par défaut est "1"
        setNextTowerNumber('1')
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des tours:', error)
    } finally {
      setLoading(false)
    }
  }, [mapName])

  useEffect(() => {
    fetchTowers()
  }, [fetchTowers])

  const handleAddTower = async () => {
    if (!isAdmin) return

    try {
      const response = await fetch('/api/map/towers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mapName,
          towerNumber: nextTowerNumber,
          x: 100,
          y: 100,
          width: 150,
          height: 100,
          stars: 5,
        }),
      })

      if (response.ok) {
        const newTower = await response.json()
        setTowers([...towers, newTower])
        // Incrémenter le numéro si c'est un nombre, sinon revenir à "1"
        const num = parseInt(nextTowerNumber)
        if (!isNaN(num) && num < 12) {
          setNextTowerNumber(String(num + 1))
        } else {
          setNextTowerNumber('1')
        }
      } else {
        const error = await response.json()
        alert(error.error || t('map.towerCreateError'))
      }
    } catch (error) {
      console.error('Erreur:', error)
      alert(t('map.towerCreateError'))
    }
  }

  const handleTowerConfig = (tower: MapTower) => {
    setSelectedTower(tower)
  }

  const handleTowerUpdate = async (tower: MapTower, updates: Partial<MapTower>) => {
    try {
      const response = await fetch(`/api/map/towers/${tower.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (response.ok) {
        const updatedTower = await response.json()
        setTowers(towers.map(t => t.id === tower.id ? updatedTower : t))
      } else {
        const error = await response.json()
        console.error('Erreur lors de la mise à jour:', error)
      }
    } catch (error) {
      console.error('Erreur:', error)
    }
  }

  const handleTowerSave = (updatedTower: MapTower) => {
    setTowers(towers.map(t => t.id === updatedTower.id ? updatedTower : t))
    setSelectedTower(null)
  }

  const handleTowerDelete = (towerId: string) => {
    setTowers(towers.filter(t => t.id !== towerId))
    setSelectedTower(null)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">{t('map.title')}</h1>
          <p className="text-gray-400 mb-3">{t('map.subtitle')}</p>
          <div className="flex items-center gap-2">
            <select
              value={mapName}
              onChange={(e) => setMapName(e.target.value)}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="map.png">{t('map.siege')}</option>
              <option value="map_tournament.png">{t('map.tournament')}</option>
            </select>
            <Button
              type="button"
              onClick={() => setShowTowerList(!showTowerList)}
              className={`px-4 py-2 ${showTowerList ? 'bg-blue-600' : ''}`}
            >
              {showTowerList ? t('map.showMap') : t('map.towerList')}
            </Button>
            <Button
              type="button"
              onClick={() => setShowNames(!showNames)}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600"
            >
              {showNames ? (t('map.showImages') || 'Afficher les images') : (t('map.showNames') || 'Afficher les pseudos')}
            </Button>
          </div>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className={`p-2 rounded-lg transition-colors ${
                isEditing 
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
              }`}
              title={isEditing ? t('map.exitEditMode') : t('map.editMode')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            {isEditing && (
              <Button
                type="button"
                onClick={handleAddTower}
              >
                {t('map.addTower')}
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="relative" style={{ minHeight: '600px' }}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-400">{t('map.loading')}</div>
          </div>
        ) : showTowerList ? (
          <div className="bg-slate-800 rounded-lg p-4">
            <TowerList
              towers={towers.filter(t => t.mapName === mapName)}
              onTowerClick={handleTowerConfig}
              isEditing={isEditing}
              showNames={showNames}
            />
          </div>
        ) : (
          <MapView
            mapName={mapName}
            towers={towers}
            isEditing={isEditing}
            onTowerConfig={handleTowerConfig}
            onTowerUpdate={handleTowerUpdate}
            showNames={showNames}
          />
        )}
      </div>

      {selectedTower && (
        <TowerConfigModal
          tower={selectedTower}
          onClose={() => setSelectedTower(null)}
          onSave={handleTowerSave}
          onDelete={handleTowerDelete}
          allTowers={towers}
        />
      )}
    </div>
  )
}

