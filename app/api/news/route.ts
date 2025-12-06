import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-helpers'
import { canEditNews, getUserWithPermissions } from '@/lib/permissions'

export async function GET() {
  try {
    await requireAuth()
    
    const posts = await prisma.newsPost.findMany({
      orderBy: [
        { isPinned: 'desc' },
        { createdAt: 'desc' },
      ],
    })
    
    // Récupérer les informations des créateurs et modificateurs
    const postsWithUsers = await Promise.all(
      posts.map(async (post) => {
        const createdByUser = await prisma.user.findUnique({
          where: { id: post.createdBy },
          select: { id: true, name: true, identifier: true },
        })
        const updatedByUser = await prisma.user.findUnique({
          where: { id: post.updatedBy },
          select: { id: true, name: true, identifier: true },
        })
        
        return {
          ...post,
          createdByUser: {
            name: createdByUser?.name || createdByUser?.identifier || 'Inconnu',
          },
          updatedByUser: {
            name: updatedByUser?.name || updatedByUser?.identifier || 'Inconnu',
          },
        }
      })
    )
    
    return NextResponse.json(postsWithUsers)
  } catch (error: any) {
    // Ne pas logger les erreurs NEXT_REDIRECT (redirections normales de Next.js)
    if (error?.digest?.startsWith('NEXT_REDIRECT')) {
      throw error // Re-lancer la redirection pour qu'elle soit gérée par Next.js
    }
    console.error('Erreur lors de la récupération des posts News:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    
    const user = await getUserWithPermissions(session.user.id)
    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      )
    }
    
    if (!canEditNews(user)) {
      return NextResponse.json(
        { error: 'Non autorisé. Vous n\'avez pas la permission de créer des posts News.' },
        { status: 403 }
      )
    }
    
    const body = await request.json()
    const { title, content, isPinned } = body
    
    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Le contenu est requis' },
        { status: 400 }
      )
    }
    
    const post = await prisma.newsPost.create({
      data: {
        title: title && title.trim() ? title.trim() : null,
        content,
        isPinned: isPinned === true,
        createdBy: session.user.id,
        updatedBy: session.user.id,
      },
    })
    
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'create',
        entityType: 'news',
        entityId: post.id,
        details: JSON.stringify({
          title: post.title || '',
          content: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
          isPinned: post.isPinned,
        }),
      },
    })
    
    return NextResponse.json(post, { status: 201 })
  } catch (error: any) {
    // Ne pas logger les erreurs NEXT_REDIRECT (redirections normales de Next.js)
    if (error?.digest?.startsWith('NEXT_REDIRECT')) {
      throw error // Re-lancer la redirection pour qu'elle soit gérée par Next.js
    }
    console.error('Erreur lors de la création du post News:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

