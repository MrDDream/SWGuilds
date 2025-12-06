/**
 * Extrait le nom du monstre depuis une clé composite "nom|id" ou retourne le nom tel quel
 * @param monsterNameOrKey Le nom du monstre ou la clé composite "nom|id"
 * @returns Le nom du monstre sans l'ID
 */
export function getMonsterDisplayName(monsterNameOrKey: string | null | undefined): string {
  if (!monsterNameOrKey) return ''
  if (monsterNameOrKey.includes('|')) {
    return monsterNameOrKey.split('|')[0]
  }
  return monsterNameOrKey
}

