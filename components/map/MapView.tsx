'use client'

import { useState, useEffect, useRef } from 'react'
import { Tower } from './Tower'

interface MapTower {
  id: string
  mapName: string
  towerNumber: string
  name: string | null
  stars: number
  x: number
  y: number
  width: number
  height: number
  defenseIds: string
  createdAt: string
  updatedAt: string
  createdBy: string
}

interface MapViewProps {
  mapName: string
  towers: MapTower[]
  isEditing: boolean
  onTowerConfig: (tower: MapTower) => void
  onTowerUpdate: (tower: MapTower, updates: Partial<MapTower>) => void
  showNames?: boolean
}

export function MapView({ mapName, towers, isEditing, onTowerConfig, onTowerUpdate, showNames = false }: MapViewProps) {
  const [mapScale, setMapScale] = useState(1)
  const [imageLoaded, setImageLoaded] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const calculateScale = () => {
      if (!containerRef.current || !imageRef.current) return

      const container = containerRef.current
      const img = imageRef.current

      if (!img.complete || img.naturalWidth === 0) return

      const containerWidth = container.clientWidth
      const containerHeight = container.clientHeight
      const imgWidth = img.naturalWidth
      const imgHeight = img.naturalHeight

      // Détecter si on est sur mobile (largeur < 768px)
      const isMobile = containerWidth < 768

      let scale: number
      if (isMobile) {
        // Sur mobile, utiliser une largeur de référence fixe plus grande pour agrandir la carte
        // L'utilisateur pourra zoomer si nécessaire
        const referenceWidth = Math.min(1200, containerWidth * 2.5) // Utiliser 2.5x la largeur ou max 1200px
        scale = referenceWidth / imgWidth
      } else {
        // Sur desktop, calculer l'échelle pour que l'image s'adapte au conteneur
        const availableWidth = containerWidth * 0.95
        const scaleX = availableWidth / imgWidth
        const scaleY = containerHeight / imgHeight
        scale = Math.min(scaleX, scaleY, 1.2) // Permettre un léger agrandissement jusqu'à 120%
      }

      setMapScale(scale)
    }

    if (imageLoaded) {
      calculateScale()
    }

    window.addEventListener('resize', calculateScale)
    return () => window.removeEventListener('resize', calculateScale)
  }, [mapName, imageLoaded])

  const handleImageLoad = () => {
    setImageLoaded(true)
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-slate-900 flex items-center justify-center overflow-auto"
      style={{ minHeight: '600px' }}
    >
      <div className="relative" style={{ transform: `scale(${mapScale})`, transformOrigin: 'top left' }}>
        <div className="relative">
          <img
            ref={imageRef}
            src={`/uploads/${mapName}`}
            alt="Map"
            onLoad={handleImageLoad}
            className="block"
            style={{ display: imageLoaded ? 'block' : 'none' }}
          />
          {imageLoaded && imageRef.current && (
            <div
              className="absolute top-0 left-0"
              style={{
                width: imageRef.current.naturalWidth,
                height: imageRef.current.naturalHeight,
                pointerEvents: isEditing ? 'auto' : 'none',
              }}
            >
              {towers.map((tower) => (
                <Tower
                  key={tower.id}
                  tower={tower}
                  isEditing={isEditing}
                  onConfig={onTowerConfig}
                  onUpdate={onTowerUpdate}
                  mapScale={mapScale}
                  showNames={showNames}
                  allTowers={towers}
                />
              ))}
            </div>
          )}
        </div>
        {!imageLoaded && (
          <div className="text-gray-400 text-center py-20">
            Chargement de la map...
          </div>
        )}
      </div>
    </div>
  )
}

