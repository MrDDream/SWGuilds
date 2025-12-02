import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-helpers'
import { canEditNews, getUserWithPermissions } from '@/lib/permissions'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
    const { id } = await params
    
    const post = await prisma.newsPost.findUnique({
      where: { id },
    })
    
    if (!post) {
      return NextResponse.json(
        { error: 'Post non trouvé' },
        { status: 404 }
      )
    }
    
    const createdByUser = await prisma.user.findUnique({
      where: { id: post.createdBy },
      select: { id: true, name: true, identifier: true },
    })
    const updatedByUser = await prisma.user.findUnique({
      where: { id: post.updatedBy },
      select: { id: true, name: true, identifier: true },
    })
    
    return NextResponse.json({
      ...post,
      createdByUser: {
        name: createdByUser?.name || createdByUser?.identifier || 'Inconnu',
      },
      updatedByUser: {
        name: updatedByUser?.name || updatedByUser?.identifier || 'Inconnu',
      },
    })
  } catch (error) {
    console.error('Erreur lors de la récupération du post News:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth()
    const { id } = await params
    
    const user = await getUserWithPermissions(session.user.id)
    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      )
    }
    
    if (!canEditNews(user)) {
      return NextResponse.json(
        { error: 'Non autorisé. Vous n\'avez pas la permission de modifier des posts News.' },
        { status: 403 }
      )
    }
    
    const post = await prisma.newsPost.findUnique({
      where: { id },
    })
    
    if (!post) {
      return NextResponse.json(
        { error: 'Post non trouvé' },
        { status: 404 }
      )
    }
    
    const body = await request.json()
    const { title, content, isPinned } = body
    
    const updateData: { title?: string | null; content?: string; isPinned?: boolean; updatedBy: string } = {
      updatedBy: session.user.id,
    }
    
    if (title !== undefined) {
      updateData.title = title && title.trim() ? title.trim() : null
    }
    
    if (content !== undefined) {
      updateData.content = content
    }
    
    if (isPinned !== undefined) {
      updateData.isPinned = isPinned
    }
    
    const updatedPost = await prisma.newsPost.update({
      where: { id },
      data: updateData,
    })
    
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'update',
        entityType: 'news',
        entityId: id,
        details: JSON.stringify({
          title: updatedPost.title || '',
          content: updatedPost.content.substring(0, 100) + (updatedPost.content.length > 100 ? '...' : ''),
          isPinned: updatedPost.isPinned,
        }),
      },
    })
    
    return NextResponse.json(updatedPost)
  } catch (error) {
    console.error('Erreur lors de la mise à jour du post News:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth()
    const { id } = await params
    
    const user = await getUserWithPermissions(session.user.id)
    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      )
    }
    
    if (!canEditNews(user)) {
      return NextResponse.json(
        { error: 'Non autorisé. Vous n\'avez pas la permission de supprimer des posts News.' },
        { status: 403 }
      )
    }
    
    const post = await prisma.newsPost.findUnique({
      where: { id },
    })
    
    if (!post) {
      return NextResponse.json(
        { error: 'Post non trouvé' },
        { status: 404 }
      )
    }
    
    await prisma.newsPost.delete({
      where: { id },
    })
    
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'delete',
        entityType: 'news',
        entityId: id,
        details: JSON.stringify({
          content: post.content.substring(0, 100) + (post.content.length > 100 ? '...' : ''),
        }),
      },
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur lors de la suppression du post News:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

