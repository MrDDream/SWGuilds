import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await requireAuth()
    
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        role: true,
      }
    })
    
    return NextResponse.json({ isAdmin: user?.role === 'admin' })
  } catch (error) {
    return NextResponse.json({ isAdmin: false })
  }
}

