import { getServerSession } from 'next-auth'
import { authOptions } from './auth'
import { redirect } from 'next/navigation'
import { prisma } from './prisma'

export async function getSession() {
  return await getServerSession(authOptions)
}

export async function requireAuth() {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect('/login')
  }
  
  // Vérifier que l'utilisateur est approuvé
  const user = await prisma.user.findUnique({
    where: { id: session.user.id }
  })
  
  if (!user || !user.isApproved) {
    redirect('/login?error=not_approved')
  }
  
  return session
}

export async function requireAdmin() {
  const session = await requireAuth()
  
  const user = await prisma.user.findUnique({
    where: { id: session.user.id }
  })
  
  if (!user || user.role !== 'admin') {
    redirect('/defenses')
  }
  
  return session
}

/**
 * Vérifie si un utilisateur est l'admin créé via les variables d'environnement (.env)
 * @param userId - L'ID de l'utilisateur à vérifier
 * @returns true si l'utilisateur correspond à ADMIN_ID, false sinon
 */
export async function isEnvAdmin(userId: string): Promise<boolean> {
  const adminId = process.env.ADMIN_ID
  if (!adminId) {
    return false
  }
  
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { identifier: true }
  })
  
  return user?.identifier === adminId
}

/**
 * Vérifie si un utilisateur (par son identifier) est l'admin créé via les variables d'environnement (.env)
 * @param identifier - L'identifier de l'utilisateur à vérifier
 * @returns true si l'identifier correspond à ADMIN_ID, false sinon
 */
export function isEnvAdminByIdentifier(identifier: string): boolean {
  const adminId = process.env.ADMIN_ID
  return adminId !== undefined && identifier === adminId
}