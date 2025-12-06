import { SwarfarmMonster } from '@/lib/monster-file-cache'

// Cache en mémoire comme couche supplémentaire pour les performances
let monstersCache: SwarfarmMonster[] | null = null
let cacheTimestamp: number = 0
const MEMORY_CACHE_DURATION = 1000 * 60 * 60 // 1 heure

/**
 * Vide le cache en mémoire pour forcer un rechargement
 */
export function clearMonstersCache(): void {
  monstersCache = null
  cacheTimestamp = 0
}

/**
 * Récupère le cache en mémoire
 */
export function getMonstersCache(): SwarfarmMonster[] | null {
  return monstersCache
}

/**
 * Définit le cache en mémoire
 */
export function setMonstersCache(monsters: SwarfarmMonster[]): void {
  monstersCache = monsters
  cacheTimestamp = Date.now()
}

/**
 * Vérifie si le cache est valide
 */
export function isMonstersCacheValid(): boolean {
  if (!monstersCache) return false
  const now = Date.now()
  return (now - cacheTimestamp) < MEMORY_CACHE_DURATION
}

/**
 * Récupère le timestamp du cache
 */
export function getCacheTimestamp(): number {
  return cacheTimestamp
}

