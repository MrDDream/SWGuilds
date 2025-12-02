import { prisma } from './prisma'

interface User {
  id: string
  role: string
  canEditAllDefenses?: boolean
  canEditMap?: boolean
  canEditAssignments?: boolean
  canEditNews?: boolean
}

interface Defense {
  userId: string
}

/**
 * Vérifie si un utilisateur peut modifier une défense spécifique
 * Un utilisateur peut modifier une défense s'il :
 * - Est admin
 * - A le droit canEditAllDefenses
 * - Est le propriétaire de la défense
 */
export async function canEditDefense(user: User, defense: Defense): Promise<boolean> {
  if (user.role === 'admin') {
    return true
  }
  
  if (user.canEditAllDefenses === true) {
    return true
  }
  
  return defense.userId === user.id
}

/**
 * Vérifie si un utilisateur peut modifier le plan (map)
 * Un utilisateur peut modifier le plan s'il :
 * - Est admin
 * - A le droit canEditMap
 */
export function canEditMap(user: User): boolean {
  if (user.role === 'admin') {
    return true
  }
  
  return user.canEditMap === true
}

/**
 * Vérifie si un utilisateur peut modifier les affectations de défenses
 * Un utilisateur peut modifier les affectations s'il :
 * - Est admin
 * - A le droit canEditAssignments
 */
export function canEditAssignments(user: User): boolean {
  if (user.role === 'admin') {
    return true
  }
  
  return user.canEditAssignments === true
}

/**
 * Vérifie si un utilisateur peut modifier les News
 * Un utilisateur peut modifier les News s'il :
 * - Est admin
 * - A le droit canEditNews
 */
export function canEditNews(user: User): boolean {
  if (user.role === 'admin') {
    return true
  }
  
  return user.canEditNews === true
}

/**
 * Récupère un utilisateur avec tous ses droits depuis la base de données
 */
export async function getUserWithPermissions(userId: string): Promise<User | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      canEditAllDefenses: true,
      canEditMap: true,
      canEditAssignments: true,
      canEditNews: true,
    },
  })
  
  return user
}

